/**
 * Maps Supabase row shapes to the FE domain types defined in src/types.
 * Keeps the conversion isolated so server-side code can swap to generated
 * types without touching FE components.
 */

import type { Database } from "@/lib/supabase/types";
import type { Wallet, Transaction, Budget, Goal, Category } from "@/types";

type WalletRow      = Database["public"]["Tables"]["wallets"]["Row"];
type TxRow          = Database["public"]["Tables"]["transactions"]["Row"];
type BudgetRow      = Database["public"]["Tables"]["budgets"]["Row"];
type BudgetStatRow  = Database["public"]["Views"]["budget_status"]["Row"];
type GoalRow        = Database["public"]["Tables"]["goals"]["Row"];
type CategoryRow    = Database["public"]["Tables"]["categories"]["Row"];

export const toWallet = (r: WalletRow): Wallet => ({
  id: r.id,
  user_id: r.user_id,
  name: r.name,
  type: r.type,
  balance: Number(r.balance),
  color: r.color,
  icon: r.icon ?? undefined,
});

export const toTransaction = (r: TxRow): Transaction => ({
  id: r.id,
  user_id: r.user_id,
  wallet_id: r.wallet_id,
  type: r.type,
  amount: Number(r.amount),
  category: r.category,
  description: r.description,
  date: r.date,
  goal_id: r.goal_id ?? undefined,
  transfer_to_wallet_id: r.transfer_to_wallet_id ?? undefined,
});

export const toBudget = (r: BudgetRow | BudgetStatRow): Budget => ({
  id: r.id,
  user_id: r.user_id,
  category: r.category,
  limit_amount: Number(r.limit_amount),
  month_year: r.month_year,
  spent: "spent" in r ? Number(r.spent) : 0,
});

export const toGoal = (r: GoalRow): Goal => ({
  id: r.id,
  user_id: r.user_id,
  goal_name: r.goal_name,
  target_amount: Number(r.target_amount),
  current_amount: Number(r.current_amount),
  deadline: r.deadline,
});

export const toCategory = (r: CategoryRow): Category => ({
  id: r.id,
  user_id: r.user_id,
  name: r.name,
  type: r.type,
  color: r.color,
  icon: r.icon ?? undefined,
  isDefault: r.is_default,
  isInternal: r.is_internal,
});
