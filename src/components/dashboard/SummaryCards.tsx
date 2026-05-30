"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight } from "lucide-react";
import { formatRupiah } from "@/lib/mock-data";
import { Transaction } from "@/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";
import { useStore } from "@/lib/store";

interface SummaryCardsProps {
  transactions: Transaction[];
}

export function SummaryCards({ transactions }: SummaryCardsProps) {
  const { t } = useTranslation();
  const { isHydrating } = useStore();

  if (isHydrating && transactions.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-3 sm:p-4 space-y-2">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense" && !t.goal_id && !t.transfer_to_wallet_id)
    .reduce((s, t) => s + t.amount, 0);

  const totalSavings = transactions
    .filter((t) => t.goal_id)
    .reduce((s, t) => s + t.amount, 0);

  const balance = totalIncome - totalExpense - totalSavings;
  const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(0) : "0";

  const cards = [
    {
      label: t("dashboard.totalIncome"),
      value: formatRupiah(totalIncome),
      icon: TrendingUp,
      iconClass: "text-green-600",
      bgClass: "bg-green-50",
      trend: "+12%",
      trendUp: true,
    },
    {
      label: t("dashboard.totalExpense"),
      value: formatRupiah(totalExpense),
      icon: TrendingDown,
      iconClass: "text-red-500",
      bgClass: "bg-red-50",
      trend: "-8%",
      trendUp: false,
    },
    {
      label: t("dashboard.netBalance"),
      value: formatRupiah(balance),
      icon: Wallet,
      iconClass: "text-primary",
      bgClass: "bg-primary/10",
      trend: `${savingsRate}% saved`,
      trendUp: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="border-border/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <div className={cn("p-2 rounded-lg", card.bgClass)}>
                <card.icon className={cn("h-4 w-4", card.iconClass)} />
              </div>
              <ArrowUpRight className={cn("h-3.5 w-3.5", card.trendUp ? "text-green-500" : "text-red-400")} />
            </div>
            <p className="text-xs text-muted-foreground mb-0.5">{card.label}</p>
            <p className="text-base sm:text-lg font-bold text-foreground leading-tight break-words tabular-nums tracking-tight">{card.value}</p>
            <p className={cn("text-xs mt-1", card.trendUp ? "text-green-600" : "text-red-500")}>{card.trend}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
