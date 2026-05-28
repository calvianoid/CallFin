"use server";

import { getSupabaseServer } from "@/lib/supabase/server-client";
import { toBudget } from "./mappers";
import type { Budget } from "@/types";
import { revalidatePath } from "next/cache";

export async function listBudgets(monthYear?: string): Promise<Budget[]> {
  const sb = await getSupabaseServer();
  // Use the budget_status view to get spent amount computed in SQL.
  let q = sb.from("budget_status").select("*");
  if (monthYear) q = q.eq("month_year", monthYear);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(toBudget);
}

export async function createBudget(input: {
  category: string;
  limit_amount: number;
  month_year: string;
}): Promise<Budget> {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await sb
    .from("budgets")
    .insert({ ...input, user_id: user.id } as never)
    .select("*")
    .single();
  if (error) throw error;
  revalidatePath("/budgets");
  return toBudget(data);
}

export async function updateBudget(id: string, patch: { category?: string; limit_amount?: number }): Promise<void> {
  const sb = await getSupabaseServer();
  const { error } = await sb.from("budgets").update(patch as never).eq("id", id);
  if (error) throw error;
  revalidatePath("/budgets");
}

export async function deleteBudget(id: string): Promise<void> {
  const sb = await getSupabaseServer();
  const { error } = await sb.from("budgets").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/budgets");
}
