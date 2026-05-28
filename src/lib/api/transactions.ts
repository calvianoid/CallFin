"use server";

import { getSupabaseServer } from "@/lib/supabase/server-client";
import { toTransaction } from "./mappers";
import type { Transaction, TransactionType } from "@/types";
import { revalidatePath } from "next/cache";

interface ListOptions {
  month?: string; // YYYY-MM
  walletId?: string;
  type?: TransactionType;
  limit?: number;
}

export async function listTransactions(opts: ListOptions = {}): Promise<Transaction[]> {
  const sb = await getSupabaseServer();
  let q = sb.from("transactions").select("*").order("date", { ascending: false }).order("created_at", { ascending: false });

  if (opts.month) {
    const [y, m] = opts.month.split("-").map(Number);
    const start = `${opts.month}-01`;
    const end = new Date(y, m, 0).toISOString().slice(0, 10);
    q = q.gte("date", start).lte("date", end);
  }
  if (opts.walletId) q = q.eq("wallet_id", opts.walletId);
  if (opts.type) q = q.eq("type", opts.type);
  if (opts.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(toTransaction);
}

export async function createTransaction(input: {
  wallet_id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: string;
}): Promise<Transaction> {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await sb
    .from("transactions")
    .insert({ ...input, user_id: user.id } as never)
    .select("*")
    .single();
  if (error) throw error;

  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/");
  return toTransaction(data);
}

export async function deleteTransaction(id: string): Promise<void> {
  const sb = await getSupabaseServer();
  // The trigger handles wallet balance reversal for non-transfer/non-goal txs.
  // For transfer/goal we currently don't support delete — UI also doesn't expose it.
  const { data: tx, error: fetchErr } = await sb
    .from("transactions")
    .select("type, goal_id, transfer_to_wallet_id")
    .eq("id", id)
    .single();
  if (fetchErr) throw fetchErr;
  const row = tx as unknown as { type: string; goal_id: string | null };
  if (row.type === "transfer" || row.goal_id) {
    throw new Error("Transfer and goal contribution transactions can't be deleted from this app yet");
  }

  const { error } = await sb.from("transactions").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/");
}
