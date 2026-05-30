"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";
import { formatRupiah } from "@/lib/mock-data";
import { deriveFinancials, fireNumber, monthlyPassiveIncome } from "@/lib/fire-utils";
import { Rocket, TrendingUp, Info, ArrowRight, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

const RATE_OPTIONS = [3, 3.5, 4]; // %

export default function FreedomPage() {
  const { transactions, wallets, isHydrating } = useStore();
  const { t, locale } = useTranslation();

  const derived = useMemo(() => deriveFinancials(transactions, wallets), [transactions, wallets]);

  // Only one editable input: the average monthly expense (null = follow data).
  const [ovrMonthly, setOvrMonthly] = useState<number | null>(null);
  const [withdrawalPct, setWithdrawalPct] = useState(4);

  const avgMonthly = ovrMonthly ?? Math.round(derived.avgMonthlyExpense);
  const annualExpenses = avgMonthly * 12;
  const rate = withdrawalPct / 100;
  const target = fireNumber(annualExpenses, rate);
  const multiplier = rate > 0 ? 1 / rate : 0;
  const netWorth = Math.round(derived.netWorth);
  const progress = target > 0 ? Math.min(netWorth / target, 1) : 0;
  const passive = monthlyPassiveIncome(target, rate);
  const hasData = derived.monthsOfData > 0;

  if (isHydrating && transactions.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl space-y-5">
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

      {/* ── The 4% Rule flow: monthly → ×12 → ×25 → FIRE ── */}
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-1">
            <FlowStep
              label={t("fire.stepMonthly")}
              value={formatRupiah(avgMonthly)}
              sub={hasData ? t("fire.fromData", { months: derived.monthsOfData }) : undefined}
            />
            <FlowOp text="× 12" />
            <FlowStep
              label={t("fire.stepAnnual")}
              value={formatRupiah(annualExpenses)}
            />
            <FlowOp text={`× ${multiplier.toFixed(multiplier % 1 === 0 ? 0 : 1)}`} highlight />
            <FlowStep
              label={t("fire.stepFire")}
              value={formatRupiah(target)}
              primary
            />
          </div>
        </CardContent>
      </Card>

      {/* Hero FIRE number + passive income */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Rocket className="h-3.5 w-3.5 text-primary" />
              {t("fire.heroLabel")}
            </div>
            <p className="text-2xl font-extrabold tabular-nums text-primary leading-tight">
              {formatRupiah(target)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5">{t("fire.heroHint")}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              {t("fire.passiveIncome")}
            </div>
            <p className="text-2xl font-extrabold tabular-nums text-green-600 leading-tight">
              {formatRupiah(passive)}
              <span className="text-sm font-medium text-muted-foreground">/{locale === "en" ? "mo" : "bln"}</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5">{t("fire.passiveIncomeHint")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress toward FIRE */}
      <Card className="border-border/50">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{t("fire.progressLabel")}</span>
            <span className="text-sm font-bold text-primary tabular-nums">{(progress * 100).toFixed(1)}%</span>
          </div>
          <Progress value={progress * 100} className="h-3 [&>div]:bg-primary" />
          <p className="text-xs text-muted-foreground tabular-nums">
            {t("fire.progressOf", { current: formatRupiah(netWorth), target: formatRupiah(target) })}
          </p>
        </CardContent>
      </Card>

      {/* Minimal controls: monthly expense + withdrawal rate */}
      <Card className="border-border/50">
        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Calculator className="h-3 w-3" /> {t("fire.stepMonthly")}
            </Label>
            <CurrencyInput
              value={String(avgMonthly)}
              onValueChange={(v) => setOvrMonthly(parseFloat(v) || 0)}
              placeholder="11.000.000"
            />
            <p className="text-[10px] text-muted-foreground">{t("fire.adjustMonthly")}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("fire.withdrawalRate")}</Label>
            <div className="flex gap-2">
              {RATE_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setWithdrawalPct(r)}
                  className={cn(
                    "flex-1 h-9 rounded-lg text-sm font-medium border transition-colors tabular-nums",
                    withdrawalPct === r
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {r}%
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">{t("fire.rateNote")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Explainer — the 4% rule in one paragraph */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <p className="text-sm font-semibold mb-1">{t("fire.explainTitle")}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{t("fire.explainBody")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function FlowStep({
  label, value, sub, primary,
}: { label: string; value: string; sub?: string; primary?: boolean }) {
  return (
    <div className={cn(
      "flex-1 rounded-xl p-3 text-center",
      primary ? "bg-primary/10 border border-primary/30" : "bg-muted/50",
    )}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <p className={cn(
        "font-bold tabular-nums leading-tight text-sm sm:text-base",
        primary && "text-primary",
      )}>
        {value}
      </p>
      {sub && <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function FlowOp({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <div className="flex sm:flex-col items-center justify-center gap-1 px-1 py-1 sm:py-0">
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground rotate-90 sm:rotate-0" />
      <span className={cn(
        "text-xs font-bold tabular-nums",
        highlight ? "text-primary" : "text-muted-foreground",
      )}>
        {text}
      </span>
    </div>
  );
}
