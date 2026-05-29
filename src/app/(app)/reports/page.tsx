"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MonthPicker, formatMonthLabel } from "@/components/ui/month-picker";
import { formatRupiah, CATEGORY_COLORS } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import {
  Download, TrendingUp, TrendingDown, Sparkles, PiggyBank,
  Calendar, Activity, Receipt, ArrowUpRight, ArrowDownRight,
  Wallet as WalletIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend,
} from "recharts";

// Tailwind hex palette for charts (works well in both light & dark themes)
const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6",
  "#6366f1", "#a855f7", "#22c55e", "#eab308", "#0ea5e9",
];

export default function ReportsPage() {
  const { transactions, budgets, goals, wallets } = useStore();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // ──────────────────────────────────────────────────────────────────────────
  // Main stats for selected month
  // ──────────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const inMonth = transactions.filter((t) => t.date.startsWith(month));
    const expenses = inMonth.filter((t) => t.type === "expense" && !t.goal_id && !t.transfer_to_wallet_id);
    const incomes = inMonth.filter((t) => t.type === "income");
    const savings = inMonth.filter((t) => t.goal_id);
    const transfers = inMonth.filter((t) => t.type === "transfer");

    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
    const totalSavings = savings.reduce((s, t) => s + t.amount, 0);
    const net = totalIncome - totalExpense - totalSavings;
    const savingsRate = totalIncome > 0
      ? ((totalSavings + Math.max(net, 0)) / totalIncome) * 100
      : 0;

    // Category breakdown — expenses only
    const byCat: Record<string, number> = {};
    for (const t of expenses) byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    const categoryBreakdown = Object.entries(byCat)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
    const totalBreakdown = categoryBreakdown.reduce((s, c) => s + c.amount, 0);

    // Income breakdown
    const byIncomeCat: Record<string, number> = {};
    for (const t of incomes) byIncomeCat[t.category] = (byIncomeCat[t.category] || 0) + t.amount;
    const incomeBreakdown = Object.entries(byIncomeCat)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Top 5 largest expenses
    const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);

    // Daily breakdown — for line chart through the month
    const [year, mo] = month.split("-").map(Number);
    const daysInMonth = new Date(year, mo, 0).getDate();
    const dailyMap: Record<number, { income: number; expense: number; date: string }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      dailyMap[d] = { income: 0, expense: 0, date: `${d}` };
    }
    for (const t of expenses) {
      const d = parseInt(t.date.slice(-2));
      if (dailyMap[d]) dailyMap[d].expense += t.amount;
    }
    for (const t of incomes) {
      const d = parseInt(t.date.slice(-2));
      if (dailyMap[d]) dailyMap[d].income += t.amount;
    }
    const dailySeries = Object.values(dailyMap);

    // Activity stats
    const activeDates = new Set(inMonth.map((t) => t.date));
    const activeDays = activeDates.size;
    const avgTxSize = inMonth.length > 0 ? (totalExpense + totalIncome) / inMonth.length : 0;
    const dailyAvgExpense = activeDays > 0 ? totalExpense / activeDays : 0;

    // Wallet flow — sum income/expense per wallet for the month
    const walletFlow: Record<string, { in: number; out: number; net: number; name: string; icon?: string; color: string }> = {};
    for (const w of wallets) {
      walletFlow[w.id] = { in: 0, out: 0, net: 0, name: w.name, icon: w.icon, color: w.color };
    }
    for (const t of inMonth) {
      const w = walletFlow[t.wallet_id];
      if (!w) continue;
      if (t.type === "income") { w.in += t.amount; w.net += t.amount; }
      else { w.out += t.amount; w.net -= t.amount; }
    }
    // Add destination side for transfers
    for (const t of transfers) {
      if (t.transfer_to_wallet_id && walletFlow[t.transfer_to_wallet_id]) {
        walletFlow[t.transfer_to_wallet_id].in += t.amount;
        walletFlow[t.transfer_to_wallet_id].net += t.amount;
      }
    }
    const walletActivity = Object.values(walletFlow)
      .filter((w) => w.in > 0 || w.out > 0)
      .sort((a, b) => (b.in + b.out) - (a.in + a.out));

    return {
      inMonth, expenses, incomes, savings, transfers,
      totalIncome, totalExpense, totalSavings, net, savingsRate,
      categoryBreakdown, totalBreakdown, incomeBreakdown,
      topExpenses, dailySeries, daysInMonth,
      activeDays, avgTxSize, dailyAvgExpense,
      walletActivity,
    };
  }, [transactions, month, wallets]);

  // ──────────────────────────────────────────────────────────────────────────
  // Previous month for comparison
  // ──────────────────────────────────────────────────────────────────────────
  const prevMonth = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [month]);

  const prevStats = useMemo(() => {
    const prevTxs = transactions.filter((t) => t.date.startsWith(prevMonth));
    const prevExpense = prevTxs
      .filter((t) => t.type === "expense" && !t.goal_id && !t.transfer_to_wallet_id)
      .reduce((s, t) => s + t.amount, 0);
    const prevIncome = prevTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);

    const byCat: Record<string, number> = {};
    for (const t of prevTxs.filter((t) => t.type === "expense" && !t.goal_id && !t.transfer_to_wallet_id)) {
      byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    }
    return { prevExpense, prevIncome, prevByCat: byCat };
  }, [transactions, prevMonth]);

  // ──────────────────────────────────────────────────────────────────────────
  // 6-month trend for the bar chart
  // ──────────────────────────────────────────────────────────────────────────
  const sixMonthTrend = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const trend: { month: string; label: string; income: number; expense: number; net: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const txs = transactions.filter((t) => t.date.startsWith(ym));
      const inc = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const exp = txs
        .filter((t) => t.type === "expense" && !t.goal_id && !t.transfer_to_wallet_id)
        .reduce((s, t) => s + t.amount, 0);
      const SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      trend.push({
        month: ym,
        label: SHORT[d.getMonth()],
        income: inc,
        expense: exp,
        net: inc - exp,
      });
    }
    return trend;
  }, [transactions, month]);

  // ──────────────────────────────────────────────────────────────────────────
  // Budget adherence for selected month
  // ──────────────────────────────────────────────────────────────────────────
  const budgetStatus = useMemo(() => {
    const monthBudgets = budgets.filter((b) => b.month_year === month);
    return monthBudgets.map((b) => {
      const spent = stats.expenses
        .filter((t) => t.category === b.category)
        .reduce((s, t) => s + t.amount, 0);
      const pct = b.limit_amount > 0 ? (spent / b.limit_amount) * 100 : 0;
      return { ...b, spent, pct };
    }).sort((a, b) => b.pct - a.pct);
  }, [budgets, month, stats.expenses]);

  // ──────────────────────────────────────────────────────────────────────────
  // AI insights — multiple, dynamic
  // ──────────────────────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const out: { type: "positive" | "warning" | "tip" | "info"; text: string }[] = [];

    if (stats.totalExpense === 0 && stats.totalIncome === 0) {
      out.push({ type: "tip", text: `Belum ada transaksi di ${formatMonthLabel(month)}. Mulai catat transaksimu untuk dapat insight!` });
      return out;
    }

    // Month-over-month
    if (prevStats.prevExpense > 0) {
      const diff = ((stats.totalExpense - prevStats.prevExpense) / prevStats.prevExpense) * 100;
      if (diff < -5) out.push({ type: "positive", text: `Pengeluaranmu turun ${Math.abs(diff).toFixed(0)}% dibanding ${formatMonthLabel(prevMonth)} (${formatRupiah(prevStats.prevExpense - stats.totalExpense)} lebih hemat).` });
      else if (diff > 15) out.push({ type: "warning", text: `Pengeluaran naik ${diff.toFixed(0)}% dibanding bulan lalu (+${formatRupiah(stats.totalExpense - prevStats.prevExpense)}). Cek di kategori mana naiknya.` });
    }
    if (prevStats.prevIncome > 0) {
      const diff = ((stats.totalIncome - prevStats.prevIncome) / prevStats.prevIncome) * 100;
      if (diff > 10) out.push({ type: "positive", text: `Pemasukan naik ${diff.toFixed(0)}% dibanding bulan lalu — momentum bagus!` });
      else if (diff < -15) out.push({ type: "warning", text: `Pemasukan turun ${Math.abs(diff).toFixed(0)}% dibanding bulan lalu. Adjust budget kalau perlu.` });
    }

    // Savings rate
    if (stats.savingsRate >= 30) out.push({ type: "positive", text: `Savings rate ${stats.savingsRate.toFixed(0)}% — sangat sehat untuk financial future-mu.` });
    else if (stats.savingsRate < 10 && stats.totalIncome > 0) out.push({ type: "warning", text: `Savings rate cuma ${stats.savingsRate.toFixed(0)}%. Target ideal minimal 20%.` });

    // Top category
    if (stats.categoryBreakdown[0]) {
      const top = stats.categoryBreakdown[0];
      const pct = ((top.amount / stats.totalBreakdown) * 100).toFixed(0);
      // Compare to previous month
      const prevTop = prevStats.prevByCat[top.category];
      if (prevTop && prevTop > 0) {
        const diff = ((top.amount - prevTop) / prevTop) * 100;
        if (Math.abs(diff) > 30) {
          out.push({ type: "info", text: `${top.category} (${formatRupiah(top.amount)}, ${pct}% total) ${diff > 0 ? "naik" : "turun"} ${Math.abs(diff).toFixed(0)}% vs ${formatMonthLabel(prevMonth)}.` });
        } else {
          out.push({ type: "tip", text: `Pengeluaran terbesar di kategori ${top.category} (${formatRupiah(top.amount)}, ${pct}% dari total).` });
        }
      } else {
        out.push({ type: "tip", text: `Pengeluaran terbesar di kategori ${top.category} (${formatRupiah(top.amount)}, ${pct}% dari total).` });
      }
    }

    // Goal savings
    if (stats.totalSavings > 0) {
      out.push({ type: "positive", text: `Kamu setor ${formatRupiah(stats.totalSavings)} ke goal bulan ini. Konsisten 👏` });
    } else if (goals.length > 0 && stats.savingsRate > 15) {
      out.push({ type: "tip", text: `Punya goal tapi belum setor bulan ini. Pertimbangkan menyisihkan dari surplus ${formatRupiah(stats.net)}.` });
    }

    // Net deficit
    if (stats.net < 0) {
      out.push({ type: "warning", text: `Defisit ${formatRupiah(Math.abs(stats.net))} di ${formatMonthLabel(month)}. Atur ulang pengeluaran atau cari tambahan income.` });
    }

    // Activity
    if (stats.activeDays > 0 && stats.activeDays < 10 && stats.inMonth.length > 5) {
      out.push({ type: "info", text: `Transaksi terkonsentrasi di ${stats.activeDays} hari. Pola pengeluaran terpusat — cek kalau ini due tanggal gajian.` });
    }

    // Budget adherence
    const overBudget = budgetStatus.filter((b) => b.pct > 100);
    if (overBudget.length > 0) {
      out.push({ type: "warning", text: `${overBudget.length} budget kelewat: ${overBudget.slice(0, 3).map((b) => b.category).join(", ")}.` });
    }
    const allHealthy = budgetStatus.length > 0 && budgetStatus.every((b) => b.pct <= 100);
    if (allHealthy) {
      out.push({ type: "positive", text: `Semua ${budgetStatus.length} budget di bulan ini masih on track. Disiplin!` });
    }

    return out;
  }, [stats, prevStats, prevMonth, month, goals, budgetStatus]);

  // ──────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ──────────────────────────────────────────────────────────────────────────
  function categoryColor(name: string, idx: number): string {
    // Match Tailwind palette to chart hex
    return CHART_COLORS[idx % CHART_COLORS.length];
  }

  // Donut: top 8 categories + "Others"
  const donutData = useMemo(() => {
    const top = stats.categoryBreakdown.slice(0, 8);
    const restAmount = stats.categoryBreakdown.slice(8).reduce((s, c) => s + c.amount, 0);
    const data = top.map((c, i) => ({ name: c.category, value: c.amount, color: categoryColor(c.category, i) }));
    if (restAmount > 0) data.push({ name: "Lainnya", value: restAmount, color: "#94a3b8" });
    return data;
  }, [stats.categoryBreakdown]);

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────
  function handlePrint() {
    if (typeof window === "undefined") return;
    // Cache & restore document.title so the saved PDF filename suggestion is
    // "CallFin — Laporan <Month>.pdf" instead of the generic app title.
    const oldTitle = document.title;
    document.title = `CallFin — Laporan ${formatMonthLabel(month)}`;
    window.print();
    setTimeout(() => { document.title = oldTitle; }, 500);
  }

  const todayLabel = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date());

  return (
    <div className="p-4 sm:p-6 max-w-5xl space-y-5">
      {/* Print-only header — visible only when printing */}
      <div className="print-only mb-3 border-b border-gray-300 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-base">CallFin</p>
            <p className="text-xs text-gray-600">Laporan Keuangan — {formatMonthLabel(month)}</p>
          </div>
          <p className="text-xs text-gray-600">Dicetak {todayLabel}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Laporan Keuangan</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Ringkasan {formatMonthLabel(month)}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={handlePrint}>
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export PDF</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </div>

      <div className="no-print">
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {/* ─── Hero KPIs ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          icon={<Activity className="h-4 w-4 text-primary" />}
          label="Net Bulan Ini"
          value={formatRupiah(stats.net)}
          subtitle={stats.net >= 0 ? "Surplus" : "Defisit"}
          accent={stats.net >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          icon={<PiggyBank className="h-4 w-4 text-violet-600" />}
          label="Savings Rate"
          value={`${stats.savingsRate.toFixed(0)}%`}
          subtitle={stats.savingsRate >= 20 ? "Target tercapai" : "Belum ideal"}
          accent={stats.savingsRate >= 20 ? "positive" : "neutral"}
        />
        <KpiCard
          icon={<Receipt className="h-4 w-4 text-sky-600" />}
          label="Transaksi"
          value={String(stats.inMonth.length)}
          subtitle={`${stats.activeDays} hari aktif`}
        />
        <KpiCard
          icon={<Calendar className="h-4 w-4 text-amber-600" />}
          label="Rata-rata/Hari"
          value={formatRupiah(stats.dailyAvgExpense)}
          subtitle="Berdasar hari aktif"
        />
      </div>

      {/* ─── Big summary ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4 text-green-600" />}
          label="Pemasukan"
          value={formatRupiah(stats.totalIncome)}
          delta={deltaPct(stats.totalIncome, prevStats.prevIncome)}
          color="text-green-600"
        />
        <SummaryCard
          icon={<TrendingDown className="h-4 w-4 text-red-500" />}
          label="Pengeluaran"
          value={formatRupiah(stats.totalExpense)}
          delta={deltaPct(stats.totalExpense, prevStats.prevExpense)}
          deltaInvert
        />
        <SummaryCard
          icon={<PiggyBank className="h-4 w-4 text-violet-600" />}
          label="Setoran Goal"
          value={formatRupiah(stats.totalSavings)}
          color="text-violet-600"
        />
      </div>

      {/* ─── AI Insights ─────────────────────────────────────────────────── */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Analisis AI — {formatMonthLabel(month)}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-2">
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-2">Belum ada insight untuk bulan ini.</p>
          ) : insights.map((ins, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 text-sm rounded-lg p-2.5",
                ins.type === "positive" && "bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300",
                ins.type === "warning" && "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
                ins.type === "tip" && "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
                ins.type === "info" && "bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
              )}
            >
              <span className="mt-0.5 shrink-0">
                {ins.type === "positive" ? "✅" : ins.type === "warning" ? "⚠️" : ins.type === "info" ? "ℹ️" : "💡"}
              </span>
              <p>{ins.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ─── Charts: Donut + 6-month trend ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Donut */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribusi Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            {donutData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Belum ada pengeluaran.</p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="w-full sm:w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {donutData.map((d, i) => (
                          <Cell key={i} fill={d.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                        formatter={(v) => formatRupiah(Number(v) || 0)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full space-y-1.5 text-xs">
                  {donutData.map((d, i) => {
                    const pct = (d.value / stats.totalBreakdown) * 100;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                        <span className="flex-1 truncate">{d.name}</span>
                        <span className="text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
                        <span className="font-medium tabular-nums w-24 text-right">{formatRupiah(d.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 6-month trend */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tren 6 Bulan Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sixMonthTrend} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} />
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => formatRupiah(Number(v) || 0)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="income" name="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Daily pattern ───────────────────────────────────────────────── */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Aktivitas Harian — {formatMonthLabel(month)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.dailySeries} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={Math.floor(stats.daysInMonth / 10)} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}jt`} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => formatRupiah(Number(v) || 0)}
                  labelFormatter={(d) => `Tanggal ${d}`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="expense" name="Pengeluaran" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="income" name="Pemasukan" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ─── Top 5 + Wallet Activity row ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Top 5 expenses */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">5 Pengeluaran Terbesar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.topExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada pengeluaran.</p>
            ) : stats.topExpenses.map((tx) => {
              const w = wallets.find((x) => x.id === tx.wallet_id);
              return (
                <div key={tx.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/40">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-950 shrink-0">
                    <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description || tx.category}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className={cn("text-[10px] h-4", CATEGORY_COLORS[tx.category] || "bg-gray-100 text-gray-700")}>
                        {tx.category}
                      </Badge>
                      {w && <span>{w.icon} {w.name}</span>}
                    </div>
                  </div>
                  <p className="text-sm font-semibold tabular-nums shrink-0">{formatRupiah(tx.amount)}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Wallet activity */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Aktivitas Dompet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.walletActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada aktivitas dompet.</p>
            ) : stats.walletActivity.map((w, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span>{w.icon}</span>
                    <span className="truncate">{w.name}</span>
                  </span>
                  <span className={cn(
                    "text-xs tabular-nums font-semibold",
                    w.net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"
                  )}>
                    {w.net >= 0 ? "+" : ""}{formatRupiah(w.net)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground tabular-nums">
                  <span className="flex items-center gap-0.5">
                    <ArrowUpRight className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                    {formatRupiah(w.in)}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <ArrowDownRight className="h-2.5 w-2.5 text-red-500" />
                    {formatRupiah(w.out)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ─── Budget adherence ────────────────────────────────────────────── */}
      {budgetStatus.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Kepatuhan Budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {budgetStatus.map((b) => {
              const isDanger = b.pct >= 100;
              const isWarning = b.pct >= 80 && b.pct < 100;
              return (
                <div key={b.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <Badge variant="secondary" className={cn("text-[10px] h-4", CATEGORY_COLORS[b.category] || "bg-gray-100 text-gray-700")}>
                        {b.category}
                      </Badge>
                      {isDanger && <span className="text-[10px] font-bold text-red-500">OVER</span>}
                      {isWarning && <span className="text-[10px] font-bold text-amber-600">WASPADA</span>}
                    </span>
                    <span className="text-xs tabular-nums">
                      <span className="font-semibold">{formatRupiah(b.spent)}</span>
                      <span className="text-muted-foreground"> / {formatRupiah(b.limit_amount)}</span>
                    </span>
                  </div>
                  <Progress value={Math.min(b.pct, 100)} className={cn("h-1.5", isDanger ? "[&>div]:bg-red-500" : isWarning ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary")} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ─── Expense by category detail ──────────────────────────────────── */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pengeluaran per Kategori</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {stats.categoryBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada pengeluaran di bulan ini.</p>
          ) : stats.categoryBreakdown.map((c, i) => {
            const pct = (c.amount / stats.totalBreakdown) * 100;
            const prev = prevStats.prevByCat[c.category];
            const diff = prev && prev > 0 ? ((c.amount - prev) / prev) * 100 : null;
            return (
              <div key={c.category} className="space-y-1">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className={cn("text-xs w-28 sm:w-32 justify-center shrink-0", CATEGORY_COLORS[c.category] || "bg-gray-100 text-gray-700")}>
                    {c.category}
                  </Badge>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: categoryColor(c.category, i) }} />
                  </div>
                  <span className="text-xs sm:text-sm font-medium w-24 sm:w-32 text-right shrink-0 tabular-nums">{formatRupiah(c.amount)}</span>
                </div>
                {diff !== null && Math.abs(diff) >= 5 && (
                  <p className={cn(
                    "text-[10px] tabular-nums pl-32",
                    diff > 0 ? "text-red-500" : "text-green-600 dark:text-green-400"
                  )}>
                    {diff > 0 ? "↑" : "↓"} {Math.abs(diff).toFixed(0)}% vs {formatMonthLabel(prevMonth)}
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ─── Income breakdown ────────────────────────────────────────────── */}
      {stats.incomeBreakdown.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pemasukan per Kategori</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.incomeBreakdown.map((c, i) => {
              const pct = (c.amount / stats.totalIncome) * 100;
              return (
                <div key={c.category} className="flex items-center gap-3">
                  <Badge variant="secondary" className={cn("text-xs w-28 sm:w-32 justify-center shrink-0", CATEGORY_COLORS[c.category] || "bg-emerald-100 text-emerald-700")}>
                    {c.category}
                  </Badge>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs sm:text-sm font-medium w-24 sm:w-32 text-right shrink-0 tabular-nums">{formatRupiah(c.amount)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ─── Goal contributions list ─────────────────────────────────────── */}
      {stats.savings.length > 0 && (
        <Card className="border-violet-200 bg-violet-50/50 dark:bg-violet-950/20 dark:border-violet-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-violet-600" />
              Setoran Goal Bulan Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.savings.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-background rounded-lg p-2.5 text-sm">
                <span className="truncate">{t.description}</span>
                <span className="font-semibold text-violet-700 dark:text-violet-300 shrink-0 ml-2 tabular-nums">{formatRupiah(t.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────
function KpiCard({
  icon,
  label,
  value,
  subtitle,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  accent?: "positive" | "negative" | "neutral";
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        </div>
        <p className={cn(
          "text-base sm:text-lg font-bold tabular-nums leading-tight",
          accent === "positive" && "text-green-600 dark:text-green-400",
          accent === "negative" && "text-red-500",
        )}>
          {value}
        </p>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  delta,
  color,
  deltaInvert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: number | null;
  color?: string;
  deltaInvert?: boolean;
}) {
  // For expense, positive delta is BAD, negative is GOOD. invert ensures correct color
  const goodDirection = deltaInvert
    ? delta !== null && delta !== undefined && delta < 0
    : delta !== null && delta !== undefined && delta > 0;
  return (
    <Card className="border-border/50">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <p className={cn("text-lg sm:text-xl font-bold tabular-nums break-words", color)}>{value}</p>
        {delta !== null && delta !== undefined && (
          <p className={cn(
            "text-[10px] tabular-nums mt-0.5",
            goodDirection ? "text-green-600 dark:text-green-400" : "text-red-500"
          )}>
            {delta > 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(0)}% vs bulan lalu
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function deltaPct(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}
