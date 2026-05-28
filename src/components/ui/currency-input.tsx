"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { InputHTMLAttributes, useCallback } from "react";

interface CurrencyInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> {
  /** Raw numeric string (no separators), e.g. "50000" */
  value: string;
  /** Called with raw numeric string (no separators) */
  onValueChange: (value: string) => void;
}

/** Format a numeric string with dot separators: "50000" → "50.000" */
function formatWithSeparator(raw: string): string {
  if (!raw) return "";
  // Remove non-digit chars except leading minus
  const cleaned = raw.replace(/[^\d]/g, "");
  if (!cleaned) return "";
  return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Strip separators to get raw numeric string: "50.000" → "50000" */
function stripSeparator(formatted: string): string {
  return formatted.replace(/\./g, "");
}

export function CurrencyInput({
  value,
  onValueChange,
  className,
  ...props
}: CurrencyInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = stripSeparator(e.target.value);
      // Only allow digits
      if (raw && !/^\d+$/.test(raw)) return;
      onValueChange(raw);
    },
    [onValueChange],
  );

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      className={cn("tabular-nums", className)}
      value={formatWithSeparator(value)}
      onChange={handleChange}
    />
  );
}
