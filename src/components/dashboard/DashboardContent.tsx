"use client";

import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { BudgetOverview } from "@/components/dashboard/BudgetOverview";
import { WalletsStrip } from "@/components/dashboard/WalletsStrip";
import { useStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import { formatRupiah } from "@/lib/mock-data";
import { getYearMonth } from "@/lib/utils";

export function DashboardContent() {
  const { transactions, budgets, goals, wallets } = useStore();
  const { t, locale } = useTranslation();
  const currentMonth = getYearMonth();
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const heroMonthTx = transactions.filter((tx) => tx.date.slice(0, 7) === currentMonth);
  const heroIncome = heroMonthTx.filter((tx) => tx.type === "income").reduce((s, tx) => s + tx.amount, 0);
  const heroExpense = heroMonthTx
    .filter((tx) => tx.type === "expense" && !tx.goal_id && !tx.transfer_to_wallet_id)
    .reduce((s, tx) => s + tx.amount, 0);
  const savingsRate = heroIncome > 0 ? Math.round(((heroIncome - heroExpense) / heroIncome) * 100) : null;

  // Insight sederhana bergaya "Analisis AI" di Beranda (deterministik, tanpa API):
  // kategori yang melonjak vs bulan lalu, pengingat setoran goal, dan status budget.
  const insights = useMemo(() => {
    const list: { text: string; tone: "warning" | "positive" | "tip" }[] = [];
    const prev = new Date();
    prev.setMonth(prev.getMonth() - 1);
    const prevMonth = getYearMonth(prev);
    const sumByCat = (ym: string) => {
      const map = new Map<string, number>();
      for (const tx of transactions) {
        if (tx.date.slice(0, 7) !== ym || tx.type !== "expense" || tx.goal_id || tx.transfer_to_wallet_id) continue;
        map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
      }
      return map;
    };
    const cur = sumByCat(currentMonth);
    const before = sumByCat(prevMonth);
    let spike: { cat: string; pct: number; amt: number } | null = null;
    for (const [cat, amt] of cur) {
      const b = before.get(cat) ?? 0;
      if (b > 0 && amt > b * 1.2 && amt >= 100000) {
        const pct = Math.round(((amt - b) / b) * 100);
        if (!spike || pct > spike.pct) spike = { cat, pct, amt };
      }
    }
    if (spike) {
      list.push({
        tone: "warning",
        text:
          locale === "en"
            ? `${spike.cat} up ${spike.pct}% vs last month — ${formatRupiah(spike.amt)}.`
            : `${spike.cat} naik ${spike.pct}% vs bulan lalu — ${formatRupiah(spike.amt)}.`,
      });
    }
    const goalDepositThisMonth = transactions.some(
      (tx) => tx.goal_id && tx.date.slice(0, 7) === currentMonth,
    );
    if (goals.length > 0 && !goalDepositThisMonth && heroIncome - heroExpense > 0) {
      list.push({
        tone: "tip",
        text:
          locale === "en"
            ? `No goal deposit yet this month. Surplus ${formatRupiah(heroIncome - heroExpense)} — set some aside?`
            : `Belum setor goal bulan ini. Surplus ${formatRupiah(heroIncome - heroExpense)} — sisihkan sebagian?`,
      });
    }
    if (savingsRate !== null && savingsRate >= 30 && list.length < 3) {
      list.push({
        tone: "positive",
        text: locale === "en" ? `Savings rate ${savingsRate}% — very healthy.` : `Savings rate ${savingsRate}% — sangat sehat.`,
      });
    }
    return list.slice(0, 3);
  }, [transactions, goals, currentMonth, heroIncome, heroExpense, savingsRate, locale]);

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-6xl mx-auto lg:mx-0">
      {/* Revamp: hero saldo — satu angka besar bergaya readout instrumen */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {t("dashboard.totalBalance")}
        </p>
        <p className="text-3xl sm:text-[2.75rem] sm:leading-[1.05] font-medium font-num tracking-tight">
          {formatRupiah(totalBalance)}
        </p>
        {savingsRate !== null && (
          <div className="pt-0.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-positive/10 px-2.5 py-1 text-[11px] font-medium font-num text-positive">
              <ArrowUpRight className="h-3 w-3" />
              {savingsRate}% {t("dashboard.saved")} {locale === "en" ? "this month" : "bulan ini"}
            </span>
          </div>
        )}
      </div>

      <WalletsStrip />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 sm:gap-5 items-start">
        {/* Kolom kiri: ringkasan bulan, insight proaktif, budget */}
        <div className="space-y-5 sm:space-y-6 min-w-0">
          <SummaryCards transactions={transactions} />

          {insights.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {t("dashboard.forYou")}
              </p>
              {insights.map((ins) => (
                <div
                  key={ins.text}
                  className={cn(
                    "flex items-start gap-3 rounded-xl px-4 py-3 text-sm",
                    ins.tone === "warning"
                      ? "bg-warning/10 border border-warning/25 text-foreground"
                      : "bg-card border border-border/50 text-muted-foreground",
                  )}
                >
                  {ins.tone === "warning" ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-warning" />
                  ) : ins.tone === "positive" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-positive" />
                  ) : (
                    <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                  )}
                  <span className="leading-snug">{ins.text}</span>
                </div>
              ))}
            </div>
          )}

          <BudgetOverview budgets={budgets} />
        </div>

        {/* Kolom kanan: transaksi terakhir */}
        <div className="min-w-0">
          <RecentTransactions transactions={transactions} />
        </div>
      </div>
    </div>
  );
}
