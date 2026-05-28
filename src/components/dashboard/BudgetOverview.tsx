"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Budget } from "@/types";
import { formatRupiah } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface BudgetOverviewProps {
  budgets: Budget[];
}

export function BudgetOverview({ budgets }: BudgetOverviewProps) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Budget Bulan Ini</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {budgets.map((b) => {
          const pct = Math.min(((b.spent || 0) / b.limit_amount) * 100, 100);
          const isWarning = pct >= 80;
          const isDanger = pct >= 95;

          return (
            <div key={b.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{b.category}</span>
                <span className={cn(
                  "font-medium",
                  isDanger ? "text-red-500" : isWarning ? "text-amber-500" : "text-muted-foreground"
                )}>
                  {formatRupiah(b.spent || 0)} / {formatRupiah(b.limit_amount)}
                </span>
              </div>
              <Progress
                value={pct}
                className={cn(
                  "h-1.5",
                  isDanger ? "[&>div]:bg-red-500" : isWarning ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary"
                )}
              />
              {isDanger && (
                <p className="text-[10px] text-red-500">⚠️ Budget hampir habis!</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
