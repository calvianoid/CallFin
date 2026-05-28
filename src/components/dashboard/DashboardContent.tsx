"use client";

import { FinancialChart } from "@/components/dashboard/FinancialChart";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { BudgetOverview } from "@/components/dashboard/BudgetOverview";
import { GoalsOverview } from "@/components/dashboard/GoalsOverview";
import { WalletsStrip } from "@/components/dashboard/WalletsStrip";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";
import { formatMonthLabel } from "@/components/ui/month-picker";
import { useMemo } from "react";
import { MonthlyData } from "@/types";

export function DashboardContent() {
  const { transactions, budgets, goals } = useStore();
  const { t } = useTranslation();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const monthlyData: MonthlyData[] = useMemo(() => {
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7)); // "YYYY-MM"
    }

    const SHORT_MONTHS = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];

    return months.map((ym) => {
      const [, m] = ym.split("-").map(Number);
      let income = 0;
      let expense = 0;
      for (const tx of transactions) {
        if (tx.date.slice(0, 7) !== ym) continue;
        if (tx.type === "transfer") continue;
        if (tx.type === "income") income += tx.amount;
        if (tx.type === "expense") expense += tx.amount;
      }
      return { month: SHORT_MONTHS[m - 1], income, expense };
    });
  }, [transactions]);

  return (
    <div className="p-4 sm:p-5 space-y-4 max-w-3xl mx-auto lg:mx-0">
      <div>
        <h1 className="text-lg sm:text-xl font-bold">{t("dashboard.title")}</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {formatMonthLabel(currentMonth)} — {t("dashboard.subtitle")}
        </p>
      </div>

      <WalletsStrip />

      <SummaryCards transactions={transactions} />

      <FinancialChart data={monthlyData} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <BudgetOverview budgets={budgets} />
        <GoalsOverview goals={goals} />
      </div>

      <Separator />

      <RecentTransactions transactions={transactions} />
    </div>
  );
}
