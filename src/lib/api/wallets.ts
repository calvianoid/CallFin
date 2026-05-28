"use server";

import { getSupabaseServer } from "@/lib/supabase/server-client";
import { toWallet } from "./mappers";
import type { Wallet, WalletType } from "@/types";
import { revalidatePath } from "next/cache";

export async function listWallets(): Promise<Wallet[]> {
  const sb = await getSupabaseServer();
  const { data, error } = await sb.from("wallets").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toWallet);
}

export async function createWallet(input: {
  name: string;
  type: WalletType;
  balance: number;
  color: string;
  icon?: string;
}): Promise<Wallet> {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await sb
    .from("wallets")
    .insert({ ...input, user_id: user.id } as never)
    .select("*")
    .single();
  if (error) throw error;
  revalidatePath("/wallets");
  revalidatePath("/");
  return toWallet(data);
}

export async function updateWallet(id: string, patch: Partial<Omit<Wallet, "id" | "user_id">>): Promise<void> {
  const sb = await getSupabaseServer();
  const { error } = await sb.from("wallets").update(patch as never).eq("id", id);
  if (error) throw error;
  revalidatePath("/wallets");
  revalidatePath("/");
}

export async function deleteWallet(id: string): Promise<void> {
  const sb = await getSupabaseServer();
  // Reject if transactions reference this wallet
  const { count } = await sb.from("transactions").select("id", { count: "exact", head: true }).eq("wallet_id", id);
  if ((count ?? 0) > 0) throw new Error("Wallet has transactions — cannot delete");

  const { error } = await sb.from("wallets").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/wallets");
}

export async function transferBetweenWallets(input: {
  from_wallet_id: string;
  to_wallet_id: string;
  amount: number;
  description?: string;
}): Promise<string> {
  const sb = await getSupabaseServer();
  const { data, error } = await (sb.rpc as unknown as (name: string, args: unknown) => Promise<{ data: unknown; error: unknown }>)("do_transfer", {
    p_from_wallet: input.from_wallet_id,
    p_to_wallet: input.to_wallet_id,
    p_amount: input.amount,
    p_description: input.description ?? null,
  });
  if (error) throw error as Error;
  revalidatePath("/wallets");
  revalidatePath("/transactions");
  revalidatePath("/");
  return data as string;
}
