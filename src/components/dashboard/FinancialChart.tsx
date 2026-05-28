"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { MonthlyData } from "@/types";

interface FinancialChartProps {
  data: MonthlyData[];
}

function formatTooltipValue(value: number) {
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}jt`;
  if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}rb`;
  return `Rp ${value}`;
}

function formatYAxis(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}jt`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
  return String(value);
}

export function FinancialChart({ data }: FinancialChartProps) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Tren Arus Kas</CardTitle>
        <p className="text-xs text-muted-foreground">Pemasukan vs Pengeluaran — 6 bulan terakhir</p>
      </CardHeader>
      <CardContent className="pr-2">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.623 0.214 259.815)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.623 0.214 259.815)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.577 0.245 27.325)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="oklch(0.577 0.245 27.325)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
            <Tooltip
              formatter={(value, name) => [
                formatTooltipValue(Number(value)),
                name === "income" ? "Pemasukan" : "Pengeluaran",
              ]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card)",
              }}
            />
            <Legend
              formatter={(value) => (value === "income" ? "Pemasukan" : "Pengeluaran")}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke="oklch(0.623 0.214 259.815)"
              strokeWidth={2}
              fill="url(#colorIncome)"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="oklch(0.577 0.245 27.325)"
              strokeWidth={2}
              fill="url(#colorExpense)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
