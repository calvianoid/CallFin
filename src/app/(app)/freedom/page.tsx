"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";
import { formatRupiah } from "@/lib/mock-data";
import {
  deriveFinancials,
  fireNumber,
  monthlyPassiveIncome,
  monthsToTarget,
  buildMilestones,
  coastFireNumber,
  projectGrowth,
  formatDuration,
  type FireAssumptions,
} from "@/lib/fire-utils";
import {
  Rocket, Clock, Wallet as WalletIcon, TrendingUp, Sparkles, Info, RotateCcw,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";

export default function FreedomPage() {
  const { transactions, wallets, isHydrating } = useStore();
  const { t, locale } = useTranslation();

  const derived = useMemo(
    () => deriveFinancials(transactions, wallets),
    [transactions, wallets],
  );

  // User overrides for the three data-derived inputs (null = follow data).
  const [ovrExpenses, setOvrExpenses] = useState<number | null>(null);
  const [ovrSavings, setOvrSavings] = useState<number | null>(null);
  const [ovrInvested, setOvrInvested] = useState<number | null>(null);
  // Assumptions with fixed (non-data) defaults.
  const [withdrawalPct, setWithdrawalPct] = useState(4); // %
  const [returnPct, setReturnPct] = useState(7); // %
  const [coastYears, setCoastYears] = useState(30);

  const annualExpenses = ovrExpenses ?? Math.round(derived.annualExpenses);
  const monthlySavings = ovrSavings ?? Math.max(Math.round(derived.avgMonthlySavings), 0);
  const currentInvested = ovrInvested ?? Math.round(derived.netWorth);

  const assumptions: FireAssumptions = {
    annualExpenses,
    withdrawalRate: withdrawalPct / 100,
    expectedReturn: returnPct / 100,
    currentInvested,
    monthlySavings,
  };

  const target = fireNumber(assumptions.annualExpenses, assumptions.withdrawalRate);
  const progress = target > 0 ? Math.min(currentInvested / target, 1) : 0;
  const months = monthsToTarget(currentInvested, monthlySavings, assumptions.expectedReturn, target);
  const passive = monthlyPassiveIncome(target, assumptions.withdrawalRate);
  const milestones = buildMilestones(assumptions);
  const coastTarget = coastFireNumber(target, assumptions.expectedReturn, coastYears);
  const coastProgress = coastTarget > 0 ? Math.min(currentInvested / coastTarget, 1) : 0;
  const projection = useMemo(() => projectGrowth(assumptions), [
    annualExpenses, withdrawalPct, returnPct, currentInvested, monthlySavings,
  ]);

  const hasData = derived.monthsOfData > 0;
  const usingDefaults = ovrExpenses === null && ovrSavings === null && ovrInvested === null;

  function resetToData() {
    setOvrExpenses(null);
    setOvrSavings(null);
    setOvrInvested(null);
    setWithdrawalPct(4);
    setReturnPct(7);
  }

  if (isHydrating && transactions.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl space-y-5">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary/10 shrink-0">
          <Rocket className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold">{t("fire.title")}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{t("fire.subtitle")}</p>
        </div>
      </div>

      {/* Data note */}
      <div className={cn(
        "flex items-start gap-2 text-xs rounded-lg p-3",
        hasData ? "bg-primary/5 text-muted-foreground" : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
      )}>
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>{hasData ? t("fire.dataNote", { months: derived.monthsOfData }) : t("fire.noData")}</span>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* FIRE Number */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent sm:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Rocket className="h-3.5 w-3.5 text-primary" />
              {t("fire.heroLabel")}
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-primary leading-tight">
              {formatRupiah(target)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {t("fire.basedOn", { amount: formatRupiah(annualExpenses), mult: `${(1 / (withdrawalPct / 100)).toFixed(0)}×` })}
            </p>
          </CardContent>
        </Card>

        {/* Time to FI */}
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Clock className="h-3.5 w-3.5 text-sky-600" />
              {t("fire.timeToFi")}
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold tabular-nums leading-tight">
              {formatDuration(months, locale)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5">{t("fire.timeToFiHint")}</p>
          </CardContent>
        </Card>

        {/* Passive income */}
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              {t("fire.passiveIncome")}
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-green-600 leading-tight">
              {formatRupiah(passive)}<span className="text-sm font-medium text-muted-foreground">/bln</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5">{t("fire.passiveIncomeHint")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card className="border-border/50">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{t("fire.progressLabel")}</span>
            <span className="text-sm font-bold text-primary tabular-nums">{(progress * 100).toFixed(1)}%</span>
          </div>
          <Progress value={progress * 100} className="h-3 [&>div]:bg-primary" />
          <p className="text-xs text-muted-foreground tabular-nums">
            {t("fire.progressOf", { current: formatRupiah(currentInvested), target: formatRupiah(target) })}
          </p>
        </CardContent>
      </Card>

      {/* Assumptions */}
      <Card className="border-border/50">
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm">{t("fire.assumptions")}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{t("fire.assumptionsHint")}</p>
          </div>
          {!usingDefaults && hasData && (
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={resetToData}>
              <RotateCcw className="h-3 w-3" /> {t("fire.useMyData")}
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {/* Annual expenses */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("fire.annualExpenses")}</Label>
            <CurrencyInput
              value={String(annualExpenses)}
              onValueChange={(v) => setOvrExpenses(parseFloat(v) || 0)}
              placeholder="120.000.000"
            />
            <p className="text-[10px] text-muted-foreground">{t("fire.annualExpensesHint")}</p>
          </div>

          {/* Monthly savings */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("fire.monthlySavings")}</Label>
            <CurrencyInput
              value={String(monthlySavings)}
              onValueChange={(v) => setOvrSavings(parseFloat(v) || 0)}
              placeholder="5.000.000"
            />
            <p className="text-[10px] text-muted-foreground">{t("fire.monthlySavingsHint")}</p>
          </div>

          {/* Current invested */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <WalletIcon className="h-3 w-3" /> {t("fire.currentInvested")}
            </Label>
            <CurrencyInput
              value={String(currentInvested)}
              onValueChange={(v) => setOvrInvested(parseFloat(v) || 0)}
              placeholder="50.000.000"
            />
            <p className="text-[10px] text-muted-foreground">{t("fire.currentInvestedHint")}</p>
          </div>

          {/* Coast years (only affects Coast FIRE) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("fire.coastYears")}</Label>
              <span className="text-xs font-semibold tabular-nums">{coastYears} {locale === "en" ? "yr" : "thn"}</span>
            </div>
            <input
              type="range" min={5} max={45} step={1}
              value={coastYears}
              onChange={(e) => setCoastYears(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <p className="text-[10px] text-muted-foreground">{t("fire.coastHint", { years: coastYears })}</p>
          </div>

          {/* Withdrawal rate slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("fire.withdrawalRate")}</Label>
              <span className="text-xs font-semibold tabular-nums text-primary">{withdrawalPct.toFixed(1)}%</span>
            </div>
            <input
              type="range" min={2} max={6} step={0.1}
              value={withdrawalPct}
              onChange={(e) => setWithdrawalPct(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <p className="text-[10px] text-muted-foreground">{t("fire.withdrawalRateHint")}</p>
          </div>

          {/* Expected return slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("fire.expectedReturn")}</Label>
              <span className="text-xs font-semibold tabular-nums text-primary">{returnPct.toFixed(1)}%</span>
            </div>
            <input
              type="range" min={1} max={15} step={0.5}
              value={returnPct}
              onChange={(e) => setReturnPct(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <p className="text-[10px] text-muted-foreground">{t("fire.expectedReturnHint")}</p>
          </div>
        </CardContent>
      </Card>

      {/* What-if hint */}
      <div className="flex items-start gap-2 text-xs rounded-lg p-3 bg-primary/5 text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
        <span>{t("fire.whatIf")}</span>
      </div>

      {/* Milestones */}
      <div>
        <div className="mb-2">
          <h2 className="text-sm font-semibold">{t("fire.milestones")}</h2>
          <p className="text-xs text-muted-foreground">{t("fire.milestonesHint")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Coast FIRE first (special) */}
          <MilestoneCard
            emoji="🌱"
            name={t("fire.coast")}
            hint={t("fire.coastHint", { years: coastYears })}
            target={coastTarget}
            progress={coastProgress}
            etaLabel={t("fire.milestoneEta")}
            eta={formatDuration(monthsToTarget(currentInvested, monthlySavings, assumptions.expectedReturn, coastTarget), locale)}
            targetLabel={t("fire.milestoneTarget")}
            reachedLabel={t("fire.reached")}
          />
          {milestones.map((m) => (
            <MilestoneCard
              key={m.key}
              emoji={m.key === "lean" ? "🍃" : m.key === "full" ? "🔥" : "🦞"}
              name={t(`fire.${m.key}` as Parameters<typeof t>[0])}
              hint={t(`fire.${m.key}Hint` as Parameters<typeof t>[0])}
              target={m.target}
              progress={m.progress}
              etaLabel={t("fire.milestoneEta")}
              eta={formatDuration(m.monthsToReach, locale)}
              targetLabel={t("fire.milestoneTarget")}
              reachedLabel={t("fire.reached")}
            />
          ))}
        </div>
      </div>

      {/* Projection chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("fire.projection")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("fire.projectionHint")}</p>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projection} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="fireGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.623 0.214 259.815)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="oklch(0.623 0.214 259.815)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${v}${locale === "en" ? "y" : "th"}`}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false} tickLine={false} width={46}
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}${locale === "en" ? "M" : "jt"}`}
                />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [formatRupiah(Number(v) || 0), t("fire.projectionInvested")]}
                  labelFormatter={(v) => `${t("fire.year")} ${v}`}
                />
                <ReferenceLine
                  y={target}
                  stroke="oklch(0.577 0.245 27.325)"
                  strokeDasharray="5 4"
                  label={{
                    value: t("fire.projectionTarget"),
                    position: "insideTopRight",
                    fill: "oklch(0.577 0.245 27.325)",
                    fontSize: 10,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="invested"
                  stroke="oklch(0.623 0.214 259.815)"
                  strokeWidth={2}
                  fill="url(#fireGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MilestoneCard({
  emoji, name, hint, target, progress, eta, etaLabel, targetLabel, reachedLabel,
}: {
  emoji: string;
  name: string;
  hint: string;
  target: number;
  progress: number;
  eta: string;
  etaLabel: string;
  targetLabel: string;
  reachedLabel: string;
}) {
  const reached = progress >= 1;
  return (
    <Card className={cn("border-border/50", reached && "border-green-300 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900")}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{hint}</p>
          </div>
        </div>
        <Progress value={progress * 100} className={cn("h-1.5", reached ? "[&>div]:bg-green-500" : "[&>div]:bg-primary")} />
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">{targetLabel}</span>
          <span className="font-medium tabular-nums">{formatRupiah(target)}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">{etaLabel}</span>
          <span className={cn("font-semibold tabular-nums", reached ? "text-green-600" : "text-foreground")}>
            {reached ? reachedLabel : eta}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
