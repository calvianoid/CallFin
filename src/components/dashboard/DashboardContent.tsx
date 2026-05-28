"use client";

import { FinancialChart } from "@/components/dashboard/FinancialChart";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { BudgetOverview } from "@/components/dashboard/BudgetOverview";
import { GoalsOverview } from "@/components/dashboard/GoalsOverview";
import { WalletsStrip } from "@/components/dashboard/WalletsStrip";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import { mockMonthlyData } from "@/lib/mock-data";
import { useTranslation } from "@/lib/i18n/context";
import { formatMonthLabel } from "@/components/ui/month-picker";

export function DashboardContent() {
  const { transactions, budgets, goals } = useStore();
  const { t } = useTranslation();
  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="p-4 sm:p-5 space-y-4 max-w-3xl mx-auto lg:mx-0">
      <div>
        <h1 className="text-lg sm:text-xl font-bold">{t("dashboard.title")}</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">{formatMonthLabel(currentMonth)} — {t("dashboard.subtitle")}</p>
      </div>

      <WalletsStrip />

      <SummaryCards transactions={transactions} />

      <FinancialChart data={mockMonthlyData} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <BudgetOverview budgets={budgets} />
        <GoalsOverview goals={goals} />
      </div>

      <Separator />

      <RecentTransactions transactions={transactions} />
    </div>
  );
}
