"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Budget } from "@/types";
import { useStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";
import { formatRupiah } from "@/lib/mock-data";
import { computeBudgetTrend } from "@/lib/budget-utils";
import { cn } from "@/lib/utils";

const COLOR_ACTUAL = "oklch(0.623 0.214 259.815)"; // primary blue
const COLOR_RECOMMENDED = "oklch(0.72 0.19 150)"; // green
const COLOR_OVER = "oklch(0.577 0.245 27.325)"; // red

function formatAxis(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
  return String(value);
}

export function BudgetTrendChart({ budget }: { budget: Budget }) {
  const { transactions } = useStore();
  const { t } = useTranslation();
  const trend = computeBudgetTrend(budget, transactions);

  if (!trend.hasData) {
    return (
      <p className="text-xs text-muted-foreground italic py-6 text-center">
        {t("budget.trend.empty")}
      </p>
    );
  }

  const projColor = trend.willOverrun ? COLOR_OVER : COLOR_RECOMMENDED;

  const stats: { label: string; value: string; color?: string }[] = [
    { label: t("budget.trend.recommendedDaily"), value: formatRupiah(trend.recommendedDaily), color: COLOR_RECOMMENDED },
    { label: t("budget.trend.actualDaily"), value: formatRupiah(trend.actualDaily), color: COLOR_ACTUAL },
    { label: t("budget.trend.projectedTotal"), value: formatRupiah(trend.projectedTotal), color: projColor },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md bg-muted/40 p-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-tight">{s.label}</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={trend.points} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={Math.ceil(trend.daysInMonth / 8)}
          />
          <YAxis tickFormatter={formatAxis} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={38} />
          <Tooltip
            formatter={(value, name) => {
              if (value == null) return ["", ""];
              const labels: Record<string, string> = {
                actual: t("budget.trend.actual"),
                recommended: t("budget.trend.recommended"),
                projected: t("budget.trend.projectedLine"),
              };
              return [formatRupiah(Number(value)), labels[String(name)] ?? String(name)];
            }}
            labelFormatter={(d) => `${t("budget.trend.day")} ${d}`}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)",
            }}
          />
          <ReferenceLine
            y={trend.limit}
            stroke={COLOR_OVER}
            strokeDasharray="4 4"
            strokeOpacity={0.6}
            label={{ value: t("budget.trend.limit"), position: "insideTopRight", fontSize: 10, fill: COLOR_OVER }}
          />
          {trend.exhaustDay !== null && (
            <ReferenceLine
              x={trend.exhaustDay}
              stroke={COLOR_OVER}
              strokeOpacity={0.5}
              label={{ value: `⚠︎ ${trend.exhaustDay}`, position: "top", fontSize: 10, fill: COLOR_OVER }}
            />
          )}
          <Line
            type="monotone"
            dataKey="recommended"
            name="recommended"
            stroke={COLOR_RECOMMENDED}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="projected"
            name="projected"
            stroke={projColor}
            strokeWidth={2}
            strokeDasharray="2 3"
            dot={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            name="actual"
            stroke={COLOR_ACTUAL}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <Legend color={COLOR_ACTUAL} label={t("budget.trend.actual")} />
        <Legend color={COLOR_RECOMMENDED} label={t("budget.trend.recommended")} dashed />
        <Legend color={projColor} label={t("budget.trend.projectedLine")} dashed />
        <span className={cn("ml-auto font-medium", trend.willOverrun ? "text-red-500" : "text-green-600")}>
          {trend.willOverrun
            ? trend.exhaustDay !== null
              ? t("budget.trend.exhaust", { day: trend.exhaustDay })
              : t("budget.trend.overrun")
            : t("budget.trend.onTrack")}
        </span>
      </div>
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-0.5 w-4 rounded-full"
        style={{ background: dashed ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)` : color }}
      />
      {label}
    </span>
  );
}
