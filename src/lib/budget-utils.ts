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

/** Total real expenses (excluding transfers & goal contributions) in a month. */
export function computeMonthExpenses(monthYear: string, transactions: Transaction[]): number {
  let sum = 0;
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    if (t.goal_id) continue;
    if (t.transfer_to_wallet_id) continue;
    if (!t.date.startsWith(monthYear)) continue;
    sum += t.amount;
  }
  return sum;
}

export interface OtherCategoriesInfo {
  /** Allocated remainder of the total cap: cap − Σ(category limits), floored at 0. */
  limit: number;
  /** Spent in categories that have NO explicit budget this month. */
  spent: number;
  /** Per-category breakdown of that spend, biggest first. */
  breakdown: { category: string; spent: number }[];
}

/**
 * Compute the auto "Other Categories" bucket: the slice of the total cap not
 * allocated to explicit per-category budgets, plus the spending that falls into
 * categories without their own budget.
 */
export function computeOtherCategories(
  cap: number,
  monthBudgets: Pick<Budget, "category" | "limit_amount">[],
  monthYear: string,
  transactions: Transaction[],
): OtherCategoriesInfo {
  const budgeted = new Set(monthBudgets.map((b) => b.category));
  const sumLimits = monthBudgets.reduce((s, b) => s + b.limit_amount, 0);

  const byCategory = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    if (t.goal_id) continue;
    if (t.transfer_to_wallet_id) continue;
    if (!t.date.startsWith(monthYear)) continue;
    if (budgeted.has(t.category)) continue;
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
  }

  const breakdown = [...byCategory.entries()]
    .map(([category, spent]) => ({ category, spent }))
    .sort((a, b) => b.spent - a.spent);
  const spent = breakdown.reduce((s, b) => s + b.spent, 0);

  return { limit: Math.max(cap - sumLimits, 0), spent, breakdown };
}

export interface BudgetTrendPoint {
  /** Day of month, 1-based. */
  day: number;
  /** Cumulative actual spend through this day (null for future days). */
  actual: number | null;
  /** Ideal cumulative pace from today to the limit at month end (null before today). */
  recommended: number | null;
  /** Projected cumulative spend from today at the current average pace (null before today). */
  projected: number | null;
}

export interface BudgetTrend {
  points: BudgetTrendPoint[];
  limit: number;
  /** Cumulative spend up to and including today. */
  actualSoFar: number;
  dayOfMonth: number;
  daysInMonth: number;
  /** Adaptive: remaining budget ÷ days left (incl. today). What you can spend/day from now on. */
  recommendedDaily: number;
  /** Average daily spend so far. */
  actualDaily: number;
  /** Projected end-of-month total = average so far × days in month. */
  projectedTotal: number;
  willOverrun: boolean;
  /** Day the budget is projected to hit the limit at the current pace, or null if it won't. */
  exhaustDay: number | null;
  isCurrentMonth: boolean;
  /** Whether any spend exists this month for this budget. */
  hasData: boolean;
}

/**
 * Build a per-day cumulative "burn-up" series for one budget plus the headline
 * stats (recommended daily, actual daily, projected total). Lines fork at today:
 * `recommended` heads straight to the limit, `projected` continues the current
 * pace — so the gap between them shows whether you're on track.
 */
export function computeBudgetTrend(
  budget: Pick<Budget, "category" | "month_year" | "limit_amount">,
  transactions: Transaction[],
  now: Date = new Date(),
): BudgetTrend {
  const [yStr, mStr] = budget.month_year.split("-");
  const year = Number(yStr);
  const month = Number(mStr); // 1-based
  const daysInMonth = new Date(year, month, 0).getDate();

  const nowMonth = now.toISOString().slice(0, 7);
  const isCurrentMonth = budget.month_year === nowMonth;
  const isPast = budget.month_year < nowMonth;
  // For the current month we only know actuals through today; past months are
  // fully realized; future months have no elapsed days.
  const dayOfMonth = isCurrentMonth ? now.getDate() : isPast ? daysInMonth : 0;

  const daily = new Array(daysInMonth + 1).fill(0);
  let hasData = false;
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    if (t.goal_id) continue;
    if (t.transfer_to_wallet_id) continue;
    if (t.category !== budget.category) continue;
    if (!t.date.startsWith(budget.month_year)) continue;
    const d = Number(t.date.slice(8, 10));
    if (d >= 1 && d <= daysInMonth) {
      daily[d] += t.amount;
      hasData = true;
    }
  }

  const limit = budget.limit_amount;
  const cumByDay = new Array(daysInMonth + 1).fill(0);
  let cum = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    cum += daily[d];
    cumByDay[d] = cum;
  }
  const actualSoFar = dayOfMonth > 0 ? cumByDay[dayOfMonth] : 0;

  const daysLeftInclToday = Math.max(daysInMonth - dayOfMonth + 1, 0);
  const remainingBudget = Math.max(limit - actualSoFar, 0);
  const recommendedDaily = daysLeftInclToday > 0 ? remainingBudget / daysLeftInclToday : 0;
  const actualDaily = dayOfMonth > 0 ? actualSoFar / dayOfMonth : 0;
  const projectedTotal = actualDaily * daysInMonth;
  const willOverrun = projectedTotal > limit;

  let exhaustDay: number | null = null;
  if (actualDaily > 0) {
    const dayHit = limit / actualDaily;
    if (dayHit <= daysInMonth) exhaustDay = Math.max(Math.ceil(dayHit), dayOfMonth || 1);
  }

  const denom = daysInMonth - dayOfMonth; // steps from today to month end
  const points: BudgetTrendPoint[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const actual = isCurrentMonth ? (d <= dayOfMonth ? cumByDay[d] : null) : cumByDay[d];
    let recommended: number | null = null;
    let projected: number | null = null;
    if (isCurrentMonth && dayOfMonth > 0 && d >= dayOfMonth) {
      const frac = denom > 0 ? (d - dayOfMonth) / denom : 1;
      recommended = actualSoFar + (limit - actualSoFar) * frac;
      projected = actualSoFar + (projectedTotal - actualSoFar) * frac;
    }
    points.push({ day: d, actual, recommended, projected });
  }

  return {
    points,
    limit,
    actualSoFar,
    dayOfMonth,
    daysInMonth,
    recommendedDaily,
    actualDaily,
    projectedTotal,
    willOverrun,
    exhaustDay,
    isCurrentMonth,
    hasData,
  };
}
