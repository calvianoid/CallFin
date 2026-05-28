"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MonthPicker, formatMonthLabel } from "@/components/ui/month-picker";
import { formatRupiah, CATEGORY_COLORS } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { Download, TrendingUp, TrendingDown, Sparkles, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

export default function ReportsPage() {
  const { transactions } = useStore();
  const { t } = useTranslation();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const stats = useMemo(() => {
    const inMonth = transactions.filter((t) => t.date.startsWith(month));
    const expenses = inMonth.filter((t) => t.type === "expense" && !t.goal_id);
    const incomes = inMonth.filter((t) => t.type === "income");
    const savings = inMonth.filter((t) => t.goal_id);

    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
    const totalSavings = savings.reduce((s, t) => s + t.amount, 0);
    const net = totalIncome - totalExpense - totalSavings;
    const savingsRate = totalIncome > 0 ? ((totalSavings + Math.max(net, 0)) / totalIncome) * 100 : 0;

    // Category breakdown (expenses only, excludes goal contributions)
    const byCat: Record<string, number> = {};
    for (const t of expenses) byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    const categoryBreakdown = Object.entries(byCat)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
    const totalBreakdown = categoryBreakdown.reduce((s, c) => s + c.amount, 0);

    return { inMonth, totalIncome, totalExpense, totalSavings, net, savingsRate, categoryBreakdown, totalBreakdown, expenses, incomes, savings };
  }, [transactions, month]);

  // Compare with previous month for insights
  const prevMonth = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [month]);

  const prevStats = useMemo(() => {
    const prevTxs = transactions.filter((t) => t.date.startsWith(prevMonth));
    const prevExpense = prevTxs.filter((t) => t.type === "expense" && !t.goal_id).reduce((s, t) => s + t.amount, 0);
    const prevIncome = prevTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    return { prevExpense, prevIncome };
  }, [transactions, prevMonth]);

  const insights: { type: "positive" | "warning" | "tip"; text: string }[] = [];
  if (stats.totalExpense === 0 && stats.totalIncome === 0) {
    insights.push({ type: "tip", text: `Belum ada transaksi di ${formatMonthLabel(month)}. Mulai catat transaksimu untuk dapat insight!` });
  } else {
    if (prevStats.prevExpense > 0) {
      const diff = ((stats.totalExpense - prevStats.prevExpense) / prevStats.prevExpense) * 100;
      if (diff < -5) insights.push({ type: "positive", text: `Pengeluaran ${formatMonthLabel(month)} turun ${Math.abs(diff).toFixed(0)}% dibanding ${formatMonthLabel(prevMonth)}. Bagus!` });
      else if (diff > 10) insights.push({ type: "warning", text: `Pengeluaran ${formatMonthLabel(month)} naik ${diff.toFixed(0)}% dibanding ${formatMonthLabel(prevMonth)}. Cek lagi ya!` });
    }
    if (stats.savingsRate > 30) insights.push({ type: "positive", text: `Savings rate kamu ${stats.savingsRate.toFixed(0)}% — sangat baik untuk masa depan!` });
    if (stats.totalSavings > 0) insights.push({ type: "positive", text: `Kamu sudah setor ${formatRupiah(stats.totalSavings)} ke goal di ${formatMonthLabel(month)}. Konsisten!` });
    if (stats.categoryBreakdown[0]) {
      const top = stats.categoryBreakdown[0];
      const pct = ((top.amount / stats.totalBreakdown) * 100).toFixed(0);
      insights.push({ type: "tip", text: `Pengeluaran terbesar di kategori ${top.category} (${formatRupiah(top.amount)}, ${pct}% dari total).` });
    }
    if (stats.net < 0) insights.push({ type: "warning", text: `Kamu defisit ${formatRupiah(Math.abs(stats.net))} di bulan ini. Atur pengeluaran lebih ketat!` });
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">{t("reports.title")}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{t("reports.subtitle", { month: formatMonthLabel(month) })}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">{t("reports.export")}</span>
          <span className="sm:hidden">{t("reports.exportShort")}</span>
        </Button>
      </div>

      <MonthPicker value={month} onChange={setMonth} />

      {/* AI Insights */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("reports.aiAnalysis", { month: formatMonthLabel(month) })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("reports.noInsight")}</p>
          ) : insights.map((insight, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 text-sm rounded-lg p-2.5",
                insight.type === "positive" && "bg-green-50 text-green-800",
                insight.type === "warning" && "bg-amber-50 text-amber-800",
                insight.type === "tip" && "bg-blue-50 text-blue-800"
              )}
            >
              <span className="mt-0.5 shrink-0">
                {insight.type === "positive" ? "✅" : insight.type === "warning" ? "⚠️" : "💡"}
              </span>
              <p>{insight.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <p className="text-xs text-muted-foreground">{t("reports.income")}</p>
            </div>
            <p className="text-base sm:text-lg font-bold text-green-600 tabular-nums tracking-tight break-words">{formatRupiah(stats.totalIncome)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <p className="text-xs text-muted-foreground">{t("reports.expense")}</p>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground tabular-nums tracking-tight break-words">{formatRupiah(stats.totalExpense)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank className="h-4 w-4 text-violet-600" />
              <p className="text-xs text-muted-foreground">{t("reports.goalSavings")}</p>
            </div>
            <p className="text-base sm:text-lg font-bold text-violet-600 tabular-nums tracking-tight break-words">{formatRupiah(stats.totalSavings)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("reports.byCategory")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.categoryBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("reports.noExpense")}</p>
          ) : stats.categoryBreakdown.map((c) => {
            const pct = (c.amount / stats.totalBreakdown) * 100;
            return (
              <div key={c.category} className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className={cn("text-xs w-24 justify-center shrink-0", CATEGORY_COLORS[c.category] || CATEGORY_COLORS["Lainnya"])}
                >
                  {c.category}
                </Badge>
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs sm:text-sm font-medium w-20 sm:w-28 text-right shrink-0">{formatRupiah(c.amount)}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Goal contributions */}
      {stats.savings.length > 0 && (
        <Card className="border-violet-200 bg-violet-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-violet-600" />
              {t("reports.savingsThisMonth")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.savings.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-background rounded-lg p-2.5 text-sm">
                <span className="truncate">{t.description}</span>
                <span className="font-semibold text-violet-700 shrink-0 ml-2">{formatRupiah(t.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
