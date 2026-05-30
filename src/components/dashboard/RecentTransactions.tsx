"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Transaction } from "@/types";
import { formatRupiah, CATEGORY_COLORS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { useStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const { isHydrating } = useStore();
  const { t } = useTranslation();
  const recent = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  if (isHydrating && transactions.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Transaksi Terbaru</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Transaksi Terbaru</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {recent.map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
                tx.type === "income" ? "bg-green-100" : "bg-red-100"
              )}>
                {tx.type === "income"
                  ? <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                  : <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium truncate",
                  !tx.description?.trim() && "italic text-muted-foreground/70"
                )}>
                  {tx.description?.trim() || t("tx.noDescription")}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant="secondary"
                    className={cn("text-[10px] px-1.5 py-0 h-4", CATEGORY_COLORS[tx.category] || CATEGORY_COLORS["Lainnya"])}
                  >
                    {tx.category}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {format(parseISO(tx.date), "d MMM", { locale: id })}
                  </span>
                </div>
              </div>

              <p className={cn(
                "text-sm font-semibold shrink-0",
                tx.type === "income" ? "text-green-600" : "text-foreground"
              )}>
                {tx.type === "income" ? "+" : "-"}{formatRupiah(tx.amount)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
