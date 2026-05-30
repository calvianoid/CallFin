"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Goal } from "@/types";
import { formatRupiah } from "@/lib/mock-data";
import { format, parseISO, differenceInDays } from "date-fns";
import { id } from "date-fns/locale";
import { useStore } from "@/lib/store";

interface GoalsOverviewProps {
  goals: Goal[];
}

export function GoalsOverview({ goals }: GoalsOverviewProps) {
  const { isHydrating } = useStore();

  if (isHydrating && goals.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Financial Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-10" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-2.5 w-40" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

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
