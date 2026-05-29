"use server";

import { getSupabaseServer } from "@/lib/supabase/server-client";
import { revalidatePath } from "next/cache";

export interface ImportRow {
  kind: "income" | "expense" | "transfer";
  date: string;          // ISO YYYY-MM-DD
  amount: number;
  category: string;      // already mapped to a real category name OR "Transfer"
  walletId: string;      // already mapped to a real wallet id
  toWalletId?: string;   // set when kind === "transfer"
  description: string;
}

export interface ImportResult {
  total: number;
  inserted: number;
  transferPairs: number;
  failed: { row: number; reason: string }[];
}

/**
 * Bulk-insert pre-mapped transactions. Caller is responsible for resolving raw
 * Money Lover category/wallet strings into the user's real category names and
 * wallet IDs before calling this — typically via the import wizard UI.
 *
 * Transfers go through do_transfer RPC for atomic balance updates. Regular
 * income/expense rows go through plain insert and let the apply_transaction
 * trigger update wallet balances.
 */
export async function importTransactions(rows: ImportRow[]): Promise<ImportResult> {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const failed: ImportResult["failed"] = [];
  let inserted = 0;
  let transferPairs = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      if (r.kind === "transfer") {
        if (!r.toWalletId) throw new Error("Transfer missing destination wallet");
        const { error } = await (sb.rpc as unknown as (n: string, args: unknown) => Promise<{ error: unknown }>)(
          "do_transfer",
          {
            p_from_wallet: r.walletId,
            p_to_wallet: r.toWalletId,
            p_amount: r.amount,
            p_description: r.description || null,
          },
        );
        if (error) throw error as Error;
        transferPairs += 1;
        inserted += 1;
      } else {
        const { error } = await sb.from("transactions").insert({
          user_id: user.id,
          wallet_id: r.walletId,
          type: r.kind,
          amount: r.amount,
          category: r.category,
          description: r.description || "",
          date: r.date,
        } as never);
        if (error) throw error;
        inserted += 1;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failed.push({ row: i + 1, reason: msg });
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/wallets");
  revalidatePath("/budgets");
  revalidatePath("/");

  return { total: rows.length, inserted, transferPairs, failed };
}
