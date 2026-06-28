"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BudgetDialog } from "@/components/forms/BudgetDialog";
import { BudgetCapDialog } from "@/components/forms/BudgetCapDialog";
import { BudgetTrendChart } from "@/components/dashboard/BudgetTrendChart";
import { formatRupiah } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { Budget } from "@/types";
import { Plus, AlertTriangle, CheckCircle2, TrendingDown, Pencil, Trash2, SlidersHorizontal, ChevronDown, Layers, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";
import { formatMonthLabel } from "@/components/ui/month-picker";
import { computeBudgetSpent, computeMonthExpenses, computeOtherCategories } from "@/lib/budget-utils";

export default function BudgetsPage() {
  const { budgets, deleteBudget, isHydrating, transactions, budgetCap } = useStore();
  const { t } = useTranslation();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [capOpen, setCapOpen] = useState(false);
  const [otherExpanded, setOtherExpanded] = useState(false);
  const [expandedTrend, setExpandedTrend] = useState<string | null>(null);
  const [editing, setEditing] = useState<Budget | undefined>();

  const monthBudgets = budgets.filter((b) => b.month_year === currentMonth);
  const hasCap = budgetCap !== null;

  // With a cap, the headline total is the cap and "spent" is ALL real expenses
  // this month (budgeted + unbudgeted). Without a cap, fall back to summing the
  // individual category limits.
  const sumLimits = monthBudgets.reduce((s, b) => s + b.limit_amount, 0);
  const totalBudget = hasCap ? budgetCap : sumLimits;
  const totalSpent = hasCap
    ? computeMonthExpenses(currentMonth, transactions)
    : monthBudgets.reduce((s, b) => s + computeBudgetSpent(b, transactions), 0);
  const overallPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const other = hasCap
    ? computeOtherCategories(budgetCap, monthBudgets, currentMonth, transactions)
    : null;
  const otherPct = other && other.limit > 0 ? Math.min((other.spent / other.limit) * 100, 100) : 0;
  const otherOver = other ? other.spent > other.limit : false;

  function openAdd() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(b: Budget) {
    setEditing(b);
    setDialogOpen(true);
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">{t("budget.title")}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{t("budget.subtitle", { month: formatMonthLabel(currentMonth), n: monthBudgets.length })}</p>
        </div>
        <Button size="sm" className="gap-2 shrink-0" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("budget.add")}</span>
          <span className="sm:hidden">{t("common.add")}</span>
        </Button>
      </div>

      <Card className="border-border/50 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold">{hasCap ? t("budget.capCard") : t("budget.totalCard")}</p>
              <p className="text-2xl font-bold mt-0.5">{formatRupiah(totalSpent)}</p>
              <p className="text-sm text-muted-foreground">/ {formatRupiah(totalBudget)}</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">{overallPct.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">{t("budget.used")}</p>
              </div>
            </div>
          </div>
          <Progress value={overallPct} className="h-2.5 [&>div]:bg-primary" />
          <div className="flex items-center justify-between mt-2 gap-2">
            <p className="text-xs text-muted-foreground">
              {t("budget.remaining")}: {formatRupiah(totalBudget - totalSpent)}
            </p>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs shrink-0" onClick={() => setCapOpen(true)}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {hasCap ? t("budget.editCap") : t("budget.setCap")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {isHydrating && monthBudgets.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-2.5 w-40" />
                  <Skeleton className="h-2.5 w-40" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : monthBudgets.map((b) => {
          const spent = computeBudgetSpent(b, transactions);
          const pct = Math.min((spent / b.limit_amount) * 100, 100);
          const isDanger = pct >= 95;
          const isWarning = pct >= 80 && pct < 95;
          const isGood = pct < 60;

          return (
            <Card key={b.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{b.category}</p>
                    {isDanger && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertTriangle className="h-3 w-3" /> {t("budget.dangerBadge")}
                      </Badge>
                    )}
                    {isWarning && (
                      <Badge className="text-xs bg-amber-100 text-amber-700 gap-1 hover:bg-amber-100">
                        <TrendingDown className="h-3 w-3" /> {t("budget.warningBadge")}
                      </Badge>
                    )}
                    {isGood && (
                      <Badge className="text-xs bg-green-100 text-green-700 gap-1 hover:bg-green-100">
                        <CheckCircle2 className="h-3 w-3" /> {t("budget.safeBadge")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold mr-1">{pct.toFixed(0)}%</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteBudget(b.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <Progress
                  value={pct}
                  className={cn(
                    "h-2",
                    isDanger ? "[&>div]:bg-red-500" : isWarning ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary"
                  )}
                />

                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{t("budget.spent")}: {formatRupiah(spent)}</span>
                  <span>{t("budget.limit")}: {formatRupiah(b.limit_amount)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("budget.remaining")}: {formatRupiah(b.limit_amount - (spent))}
                </p>

                <button
                  type="button"
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-border/50 py-1.5 text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
                  onClick={() => setExpandedTrend((cur) => (cur === b.id ? null : b.id))}
                  aria-expanded={expandedTrend === b.id}
                >
                  <LineChart className="h-3.5 w-3.5" />
                  {t("budget.trend.toggle")}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expandedTrend === b.id && "rotate-180")} />
                </button>

                {expandedTrend === b.id && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <BudgetTrendChart budget={b} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Auto "Other Categories" bucket — only when a total cap is set */}
        {other && (
          <Card className="border-border/50 border-dashed bg-muted/30">
            <CardContent className="p-4">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setOtherExpanded((v) => !v)}
                aria-expanded={otherExpanded}
              >
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <p className="font-semibold">{t("budget.otherCategories")}</p>
                    <Badge variant="secondary" className="text-xs">{t("budget.autoBadge")}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-sm font-bold", otherOver && "text-red-500")}>
                      {other.limit > 0 ? `${otherPct.toFixed(0)}%` : formatRupiah(other.spent)}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", otherExpanded && "rotate-180")} />
                  </div>
                </div>

                <Progress
                  value={other.limit > 0 ? otherPct : otherOver ? 100 : 0}
                  className={cn("h-2", otherOver ? "[&>div]:bg-red-500" : "[&>div]:bg-muted-foreground/50")}
                />

                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{t("budget.spent")}: {formatRupiah(other.spent)}</span>
                  <span>{t("budget.allocated")}: {formatRupiah(other.limit)}</span>
                </div>
              </button>

              {otherExpanded && (
                <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("budget.otherBreakdown")}</p>
                  {other.breakdown.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">{t("budget.otherEmpty")}</p>
                  ) : (
                    other.breakdown.map((row) => (
                      <div key={row.category} className="flex items-center justify-between text-xs">
                        <span>{row.category}</span>
                        <span className="font-medium tabular-nums">{formatRupiah(row.spent)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {monthBudgets.length === 0 && !other && (
          <Card className="border-border/50 border-dashed">
            <CardContent className="p-10 text-center">
              <p className="text-sm text-muted-foreground mb-3">{t("budget.empty")}</p>
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-1" /> {t("budget.addFirst")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <BudgetDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} />
      <BudgetCapDialog open={capOpen} onOpenChange={setCapOpen} />
    </div>
  );
}
