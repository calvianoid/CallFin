"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

const MONTH_NAMES: Record<"id" | "en", string[]> = {
  id: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

interface MonthPickerProps {
  /** Format: YYYY-MM */
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function formatMonthLabel(value: string, locale: "id" | "en" = "id"): string {
  const [y, m] = value.split("-").map(Number);
  return `${MONTH_NAMES[locale][m - 1]} ${y}`;
}

export function MonthPicker({ value, onChange, className }: MonthPickerProps) {
  const { locale } = useTranslation();
  const [year, month] = value.split("-").map(Number);

  function shift(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    onChange(`${d.getFullYear()}-${m}`);
  }

  return (
    <div className={`inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1 ${className ?? ""}`}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => shift(-1)}
        aria-label={locale === "en" ? "Previous month" : "Bulan sebelumnya"}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-1.5 px-2 text-sm font-medium min-w-[130px] justify-center">
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{formatMonthLabel(value, locale)}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => shift(1)}
        aria-label={locale === "en" ? "Next month" : "Bulan berikutnya"}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
