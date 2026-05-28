"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@/types";
import { formatRupiah, CATEGORY_COLORS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const recent = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

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
                <p className="text-sm font-medium truncate">{tx.description}</p>
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
