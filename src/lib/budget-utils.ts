import type { Budget, Transaction } from "@/types";

/**
 * Compute the up-to-date "spent" amount for a budget from the current
 * transaction list. This is preferred over reading budget.spent (which can
 * lag — e.g. when a budget is created for a category that already has
 * historical transactions in the same month). Excludes transfers and goal
 * contributions, matching what counts as "expense" everywhere else.
 */
export function computeBudgetSpent(budget: Pick<Budget, "category" | "month_year">, transactions: Transaction[]): number {
  let sum = 0;
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    if (t.goal_id) continue;
    if (t.transfer_to_wallet_id) continue;
    if (t.category !== budget.category) continue;
    if (!t.date.startsWith(budget.month_year)) continue;
    sum += t.amount;
  }
  return sum;
}
