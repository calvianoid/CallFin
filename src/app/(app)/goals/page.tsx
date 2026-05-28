"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { GoalDialog } from "@/components/forms/GoalDialog";
import { GoalContributionDialog } from "@/components/forms/GoalContributionDialog";
import { formatRupiah } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { Goal } from "@/types";
import { Plus, Target, CalendarDays, Pencil, Trash2, PiggyBank } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { id, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

export default function GoalsPage() {
  const { goals, deleteGoal } = useStore();
  const { t, locale } = useTranslation();
  const dateLocale = locale === "en" ? enUS : id;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | undefined>();
  const [contributeFor, setContributeFor] = useState<string | undefined>();

  function openAdd() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(g: Goal) {
    setEditing(g);
    setDialogOpen(true);
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">{t("goals.title")}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{t("goals.subtitle", { n: goals.length })}</p>
        </div>
        <Button size="sm" className="gap-2 shrink-0" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("goals.add")}</span>
          <span className="sm:hidden">{t("common.add")}</span>
        </Button>
      </div>

      <div className="grid gap-4">
        {goals.map((g) => {
          const pct = Math.min((g.current_amount / g.target_amount) * 100, 100);
          const remaining = g.target_amount - g.current_amount;
          const daysLeft = differenceInDays(parseISO(g.deadline), new Date());
          const deadline = format(parseISO(g.deadline), "d MMMM yyyy", { locale: dateLocale });

          return (
            <Card key={g.id} className="border-border/50 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 shrink-0">
                    <Target className="h-6 w-6 text-primary" />
                  </div>

                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-base truncate">{g.goal_name}</h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-lg font-bold text-primary mr-1">{pct.toFixed(0)}%</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(g)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteGoal(g.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground">{t("goals.progress")}</span>
                        <span className="font-medium">
                          {formatRupiah(g.current_amount)} / {formatRupiah(g.target_amount)}
                        </span>
                      </div>
                      <Progress value={pct} className="h-3 [&>div]:bg-primary rounded-full" />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>{t("goals.target")}: {deadline}</span>
                      </div>
                      <span className={cn(
                        "font-medium",
                        daysLeft <= 30 ? "text-red-500" : daysLeft <= 90 ? "text-amber-500" : "text-green-600"
                      )}>
                        {daysLeft > 0 ? t("goals.daysLeft", { n: daysLeft }) : t("goals.overdue")}
                      </span>
                    </div>

                    <div className="bg-muted rounded-lg px-3 py-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t("goals.short")}</span>
                      <span className="text-sm font-bold">{formatRupiah(remaining)}</span>
                    </div>

                    <Button
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => setContributeFor(g.id)}
                      disabled={pct >= 100}
                    >
                      <PiggyBank className="h-3.5 w-3.5" />
                      {pct >= 100 ? t("goals.achieved") : t("goals.contribute")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {goals.length === 0 && (
          <Card className="border-border/50 border-dashed">
            <CardContent className="p-10 text-center">
              <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">{t("goals.empty")}</p>
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-1" /> {t("goals.addFirst")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <GoalDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} />

      <GoalContributionDialog
        open={!!contributeFor}
        onOpenChange={(o) => !o && setContributeFor(undefined)}
        goalId={contributeFor}
      />
    </div>
  );
}
