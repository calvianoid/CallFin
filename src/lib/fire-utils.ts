import { Transaction, Wallet } from "@/types";

/**
 * FIRE (Financial Independence, Retire Early) math built around the 4% Rule.
 *
 * Core idea: once your invested assets reach `annualExpenses / withdrawalRate`
 * (= annualExpenses × 25 at a 4% rate), you can withdraw that rate every year
 * — adjusted for inflation — and, statistically, never run out.
 */

export interface FireAssumptions {
  /** Yearly spending you want your portfolio to cover. */
  annualExpenses: number;
  /** Safe withdrawal rate, e.g. 0.04 for the classic 4% Rule. */
  withdrawalRate: number;
  /** Expected *real* (inflation-adjusted) annual return, e.g. 0.07. */
  expectedReturn: number;
  /** Assets you already have invested toward FI. */
  currentInvested: number;
  /** How much you add to investments each month. */
  monthlySavings: number;
}

/** The portfolio size that makes you financially independent. */
export function fireNumber(annualExpenses: number, withdrawalRate: number): number {
  if (withdrawalRate <= 0) return 0;
  return annualExpenses / withdrawalRate;
}

/** How much you could safely withdraw each month once you hit the FIRE number. */
export function monthlyPassiveIncome(target: number, withdrawalRate: number): number {
  return (target * withdrawalRate) / 12;
}

/**
 * Months until invested assets reach `target`, compounding monthly and adding
 * `monthlySavings` each month. Returns:
 *  - 0 if already there
 *  - null if unreachable within 100 years (or savings ≤ 0 with no growth)
 */
export function monthsToTarget(
  currentInvested: number,
  monthlySavings: number,
  expectedReturn: number,
  target: number,
): number | null {
  if (target <= 0) return 0;
  if (currentInvested >= target) return 0;
  const i = expectedReturn / 12;
  if (monthlySavings <= 0 && i <= 0) return null;

  let balance = currentInvested;
  for (let m = 1; m <= 1200; m++) {
    balance = balance * (1 + i) + monthlySavings;
    if (balance >= target) return m;
  }
  return null; // > 100 years away
}

export interface Milestone {
  key: string;
  /** Multiplier applied to base annual expenses before ×(1/withdrawalRate). */
  expenseFactor: number;
  target: number;
  progress: number; // 0..1
  monthsToReach: number | null;
}

/**
 * Classic FIRE flavors, ordered easiest → hardest. Coast FIRE is handled
 * separately because it depends on a time horizon, not an expense factor.
 */
export function buildMilestones(a: FireAssumptions): Milestone[] {
  const factors: { key: string; expenseFactor: number }[] = [
    { key: "lean", expenseFactor: 0.7 },
    { key: "full", expenseFactor: 1.0 },
    { key: "fat", expenseFactor: 1.5 },
  ];
  return factors.map(({ key, expenseFactor }) => {
    const target = fireNumber(a.annualExpenses * expenseFactor, a.withdrawalRate);
    const progress = target > 0 ? Math.min(a.currentInvested / target, 1) : 0;
    const monthsToReach = monthsToTarget(
      a.currentInvested,
      a.monthlySavings,
      a.expectedReturn,
      target,
    );
    return { key, expenseFactor, target, progress, monthsToReach };
  });
}

/**
 * Coast FIRE number: the amount you'd need invested *today* so that, with
 * growth alone (no further contributions), it reaches your Full FIRE number by
 * a target horizon (years away). Hitting this means you can "coast" — stop
 * actively investing and still retire on time.
 */
export function coastFireNumber(
  fullFireTarget: number,
  expectedReturn: number,
  yearsToHorizon: number,
): number {
  if (yearsToHorizon <= 0) return fullFireTarget;
  return fullFireTarget / Math.pow(1 + expectedReturn, yearsToHorizon);
}

/** A projected net-worth point for the growth chart. */
export interface ProjectionPoint {
  year: number;
  invested: number;
}

/**
 * Year-by-year projection of invested assets, capped at the FIRE number or a
 * max horizon — whichever comes first (plus a little headroom for the chart).
 */
export function projectGrowth(a: FireAssumptions, maxYears = 50): ProjectionPoint[] {
  const target = fireNumber(a.annualExpenses, a.withdrawalRate);
  const i = a.expectedReturn / 12;
  const points: ProjectionPoint[] = [{ year: 0, invested: a.currentInvested }];
  let balance = a.currentInvested;
  let reachedYear: number | null = balance >= target ? 0 : null;

  for (let year = 1; year <= maxYears; year++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + i) + a.monthlySavings;
    }
    points.push({ year, invested: Math.round(balance) });
    if (reachedYear === null && balance >= target) {
      reachedYear = year;
      // Add ~3 years of headroom past the crossover, then stop.
      if (year + 3 <= maxYears) continue;
    }
    if (reachedYear !== null && year >= reachedYear + 3) break;
  }
  return points;
}

// ───────────────────────────────────────────────────────────────────────────
// Derive sensible defaults from the user's real data
// ───────────────────────────────────────────────────────────────────────────

export interface DerivedFinancials {
  /** Average monthly spend across months that actually have expense data. */
  avgMonthlyExpense: number;
  /** avgMonthlyExpense × 12. */
  annualExpenses: number;
  /** Average monthly (income − expense) — i.e. how much you save per month. */
  avgMonthlySavings: number;
  /** Sum of all wallet balances — a proxy for current net worth / invested. */
  netWorth: number;
  /** Number of distinct months that have any transaction. */
  monthsOfData: number;
}

/** Pulls FIRE-relevant numbers out of raw transactions + wallets. */
export function deriveFinancials(
  transactions: Transaction[],
  wallets: Wallet[],
): DerivedFinancials {
  const expenseByMonth: Record<string, number> = {};
  const incomeByMonth: Record<string, number> = {};
  const monthsSeen = new Set<string>();

  for (const t of transactions) {
    const ym = t.date.slice(0, 7);
    monthsSeen.add(ym);
    // Real spending only — exclude transfers and goal contributions.
    if (t.type === "expense" && !t.goal_id && !t.transfer_to_wallet_id) {
      expenseByMonth[ym] = (expenseByMonth[ym] || 0) + t.amount;
    }
    if (t.type === "income") {
      incomeByMonth[ym] = (incomeByMonth[ym] || 0) + t.amount;
    }
  }

  const expenseMonths = Object.keys(expenseByMonth);
  const totalExpense = Object.values(expenseByMonth).reduce((s, v) => s + v, 0);
  const avgMonthlyExpense = expenseMonths.length > 0 ? totalExpense / expenseMonths.length : 0;

  // Savings = average net across all months that have any activity.
  const allMonths = Array.from(monthsSeen);
  let totalNet = 0;
  for (const ym of allMonths) {
    totalNet += (incomeByMonth[ym] || 0) - (expenseByMonth[ym] || 0);
  }
  const avgMonthlySavings = allMonths.length > 0 ? totalNet / allMonths.length : 0;

  const netWorth = wallets.reduce((s, w) => s + w.balance, 0);

  return {
    avgMonthlyExpense,
    annualExpenses: avgMonthlyExpense * 12,
    avgMonthlySavings,
    netWorth,
    monthsOfData: monthsSeen.size,
  };
}

/** Format a month count as a friendly "X yr Y mo" / "X th Y bln" string. */
export function formatDuration(months: number | null, locale: "id" | "en"): string {
  if (months === null) return locale === "en" ? "100+ years" : "100+ tahun";
  if (months === 0) return locale === "en" ? "Reached! 🎉" : "Tercapai! 🎉";
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (locale === "en") {
    const yr = y > 0 ? `${y} yr` : "";
    const mo = m > 0 ? `${m} mo` : "";
    return [yr, mo].filter(Boolean).join(" ") || "0 mo";
  }
  const yr = y > 0 ? `${y} th` : "";
  const mo = m > 0 ? `${m} bln` : "";
  return [yr, mo].filter(Boolean).join(" ") || "0 bln";
}
