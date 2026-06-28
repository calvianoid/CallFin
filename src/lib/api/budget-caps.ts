"use server";

import { getSupabaseServer } from "@/lib/supabase/server-client";
import { revalidatePath } from "next/cache";

/** Read the total monthly budget cap for a given month, or null if unset. */
export async function getBudgetCap(monthYear: string): Promise<number | null> {
  const sb = await getSupabaseServer();
  const { data, error } = await sb
    .from("budget_caps")
    .select("total_amount")
    .eq("month_year", monthYear)
    .maybeSingle();
  if (error) throw error;
  return data ? Number((data as { total_amount: number }).total_amount) : null;
}

/** Create or update the total cap for a month. One cap per user per month. */
export async function setBudgetCap(monthYear: string, totalAmount: number): Promise<void> {
  const sb = await getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await sb
    .from("budget_caps")
    .upsert(
      { user_id: user.id, month_year: monthYear, total_amount: totalAmount } as never,
      { onConflict: "user_id,month_year" },
    );
  if (error) throw error;
  revalidatePath("/budgets");
}

/** Remove the cap for a month (reverts to per-category-sum behavior). */
export async function deleteBudgetCap(monthYear: string): Promise<void> {
  const sb = await getSupabaseServer();
  const { error } = await sb.from("budget_caps").delete().eq("month_year", monthYear);
  if (error) throw error;
  revalidatePath("/budgets");
}
