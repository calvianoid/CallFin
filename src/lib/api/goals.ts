"use server";

import { getSupabaseServer } from "@/lib/supabase/server-client";
import { toGoal } from "./mappers";
import type { Goal } from "@/types";
import { revalidatePath } from "next/cache";

export async function listGoals(): Promise<Goal[]> {
  const sb = await getSupabaseServer();
  const { data, error } = await sb.from("goals").select("*").order("deadline", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toGoal);
}

export async function createGoal(input: {
  goal_name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
}): Promise<Goal> {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await sb
    .from("goals")
    .insert({ ...input, user_id: user.id } as never)
    .select("*")
    .single();
  if (error) throw error;
  revalidatePath("/goals");
  return toGoal(data);
}

export async function updateGoal(id: string, patch: Partial<Omit<Goal, "id" | "user_id">>): Promise<void> {
  const sb = await getSupabaseServer();
  const { error } = await sb.from("goals").update(patch as never).eq("id", id);
  if (error) throw error;
  revalidatePath("/goals");
}

export async function deleteGoal(id: string): Promise<void> {
  const sb = await getSupabaseServer();
  const { error } = await sb.from("goals").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/goals");
}

export async function contributeToGoal(input: {
  goal_id: string;
  wallet_id: string;
  amount: number;
  note?: string;
}): Promise<string> {
  const sb = await getSupabaseServer();
  const { data, error } = await (sb.rpc as unknown as (name: string, args: unknown) => Promise<{ data: unknown; error: unknown }>)("do_goal_contribution", {
    p_goal_id: input.goal_id,
    p_wallet_id: input.wallet_id,
    p_amount: input.amount,
    p_note: input.note ?? null,
  });
  if (error) throw error as Error;
  revalidatePath("/goals");
  revalidatePath("/wallets");
  revalidatePath("/transactions");
  revalidatePath("/");
  return data as string;
}
