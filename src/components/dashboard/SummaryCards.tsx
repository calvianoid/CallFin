"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah } from "@/lib/mock-data";
import { Transaction } from "@/types";
import { cn, getYearMonth } from "@/lib/utils";
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
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="border-border/50">
            <div className="p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-28" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const thisMonth = getYearMonth(new Date());
  const thisMonthTx = transactions.filter((t) => t.date.slice(0, 7) === thisMonth);

  const totalIncome = thisMonthTx
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = thisMonthTx
    .filter((t) => t.type === "expense" && !t.goal_id && !t.transfer_to_wallet_id)
    .reduce((s, t) => s + t.amount, 0);
  const totalSavings = thisMonthTx
    .filter((t) => t.goal_id)
    .reduce((s, t) => s + t.amount, 0);

  const net = totalIncome - totalExpense - totalSavings;

  // Strip the "Rp" prefix — shown only from sm: up (mobile cards are too narrow
  // for it and the label already implies currency).
  const strip = (n: number) => formatRupiah(n).replace(/^Rp\s?/, "");
  const cards = [
    { label: t("dashboard.income"), value: strip(totalIncome), valueClass: "text-positive" },
    { label: t("dashboard.expense"), value: strip(totalExpense), valueClass: "text-destructive" },
    { label: t("dashboard.netThisMonth"), value: strip(net), valueClass: "text-foreground" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="border-border/50 p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs text-muted-foreground mb-1.5 truncate">{card.label}</p>
          <p className={cn("text-[13px] sm:text-xl font-semibold leading-tight font-num tracking-tight whitespace-nowrap", card.valueClass)}>
            <span className="hidden sm:inline text-muted-foreground/70 font-normal mr-1">Rp</span>
            {card.value}
          </p>
        </Card>
      ))}
    </div>
  );
}
