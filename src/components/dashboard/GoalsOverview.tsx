"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Goal } from "@/types";
import { formatRupiah } from "@/lib/mock-data";
import { format, parseISO, differenceInDays } from "date-fns";
import { id } from "date-fns/locale";

interface GoalsOverviewProps {
  goals: Goal[];
}

export function GoalsOverview({ goals }: GoalsOverviewProps) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Financial Goals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((g) => {
          const pct = Math.min((g.current_amount / g.target_amount) * 100, 100);
          const remaining = g.target_amount - g.current_amount;
          const daysLeft = differenceInDays(parseISO(g.deadline), new Date());

          return (
            <div key={g.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{g.goal_name}</p>
                <span className="text-xs font-semibold text-primary">{pct.toFixed(0)}%</span>
              </div>
              <Progress value={pct} className="h-2 [&>div]:bg-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{formatRupiah(g.current_amount)} dari {formatRupiah(g.target_amount)}</span>
                <span>{daysLeft > 0 ? `${daysLeft} hari lagi` : "Tenggat lewat"}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
