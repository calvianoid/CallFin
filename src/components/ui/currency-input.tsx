"use client";

import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { InputHTMLAttributes, useCallback, useState } from "react";

interface CurrencyInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> {
  /** Raw numeric string (no separators), e.g. "50000" */
  value: string;
  /** Called with raw numeric string (no separators) */
  onValueChange: (value: string) => void;
  /** Show the "you can type math" helper while focused. Default true. */
  hint?: boolean;
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

/** True once the text contains an arithmetic operator — the cue to switch to
 *  calculator mode. A bare "-" counts (amounts are never negative). */
function looksLikeExpression(text: string): boolean {
  return /[+\-*/()]/.test(text);
}

/**
 * Evaluate a simple arithmetic expression (+ - * / and parentheses) via the
 * shunting-yard algorithm. No `eval`/`Function` — only digits and operators are
 * ever interpreted. Returns null for anything malformed or non-finite.
 */
function evalExpression(expr: string): number | null {
  const tokens = expr.match(/\d+(?:\.\d+)?|[+\-*/()]/g);
  if (!tokens) return null;

  const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };
  const output: (number | string)[] = [];
  const ops: string[] = [];

  for (const tk of tokens) {
    if (/^\d/.test(tk)) {
      output.push(parseFloat(tk));
    } else if (tk === "(") {
      ops.push(tk);
    } else if (tk === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") output.push(ops.pop()!);
      if (!ops.length) return null; // unbalanced ")"
      ops.pop();
    } else {
      while (
        ops.length &&
        ops[ops.length - 1] !== "(" &&
        prec[ops[ops.length - 1]] >= prec[tk]
      ) {
        output.push(ops.pop()!);
      }
      ops.push(tk);
    }
  }
  while (ops.length) {
    const op = ops.pop()!;
    if (op === "(") return null; // unbalanced "("
    output.push(op);
  }

  const stack: number[] = [];
  for (const t of output) {
    if (typeof t === "number") {
      stack.push(t);
      continue;
    }
    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) return null;
    if (t === "+") stack.push(a + b);
    else if (t === "-") stack.push(a - b);
    else if (t === "*") stack.push(a * b);
    else if (t === "/") stack.push(b === 0 ? NaN : a / b);
    else return null;
  }
  if (stack.length !== 1) return null;
  return Number.isFinite(stack[0]) ? stack[0] : null;
}

export function CurrencyInput({
  value,
  onValueChange,
  className,
  hint = true,
  onBlur,
  onFocus,
  ...props
}: CurrencyInputProps) {
  const { t } = useTranslation();
  // While the user is typing a formula we hold the raw expression here so the
  // field can show "50000+25000" verbatim. null means plain-number mode.
  const [draft, setDraft] = useState<string | null>(null);
  // autoFocus'd fields are focused on mount, so seed focus from the prop to
  // show the hint immediately (e.g. the amount field in the tx dialog).
  const [focused, setFocused] = useState(!!props.autoFocus);
  const result = draft !== null ? evalExpression(draft) : null;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      if (looksLikeExpression(input)) {
        // Calculator mode. Drop grouping dots and anything that isn't a digit
        // or operator, then push the live result up so submit/Enter just works.
        const clean = input.replace(/[^\d+\-*/()]/g, "");
        setDraft(clean);
        const r = evalExpression(clean);
        if (r !== null) onValueChange(String(Math.round(r)));
        return;
      }
      setDraft(null);
      const raw = stripSeparator(input);
      if (raw && !/^\d+$/.test(raw)) return; // only digits
      onValueChange(raw);
    },
    [onValueChange],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      // Lock the formula down to its formatted result and leave calculator mode.
      if (draft !== null) {
        if (result !== null) onValueChange(String(Math.round(result)));
        setDraft(null);
      }
      onBlur?.(e);
    },
    [draft, result, onValueChange, onBlur],
  );

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      onFocus?.(e);
    },
    [onFocus],
  );

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          {...props}
          type="text"
          inputMode={draft !== null ? "text" : "numeric"}
          className={cn("font-num", result !== null && "pr-24", className)}
          value={draft !== null ? draft : formatWithSeparator(value)}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {result !== null && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-num text-muted-foreground">
            = {formatWithSeparator(String(Math.round(result)))}
          </span>
        )}
      </div>
      {hint && focused && (
        <p className="text-xs text-muted-foreground">{t("common.mathHint")}</p>
      )}
    </div>
  );
}
