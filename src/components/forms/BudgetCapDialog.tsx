"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";
import { formatRupiah } from "@/lib/mock-data";
import { getYearMonth } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface BudgetCapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BudgetCapDialog({ open, onOpenChange }: BudgetCapDialogProps) {
  // The form only mounts while the dialog is open, so its useState
  // initializers re-run on every open — no reset effect needed.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <BudgetCapForm onOpenChange={onOpenChange} />}
    </Dialog>
  );
}

function BudgetCapForm({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const { budgetCap, setBudgetCap, budgets } = useStore();
  const { t } = useTranslation();

  const currentMonth = getYearMonth();
  // The cap can't be smaller than what's already allocated to category budgets.
  const minRequired = budgets
    .filter((b) => b.month_year === currentMonth)
    .reduce((s, b) => s + b.limit_amount, 0);

  const [amount, setAmount] = useState<string>(budgetCap ? String(budgetCap) : "");

  const num = parseFloat(amount);
  const tooLow = !!num && num < minRequired;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!num || tooLow) return;
    setBudgetCap(num);
    onOpenChange(false);
  }

  function handleRemove() {
    setBudgetCap(null);
    onOpenChange(false);
  }

  return (
    <DialogContent className="top-auto bottom-0 left-0 translate-x-0 translate-y-0 max-w-full w-full rounded-b-none rounded-t-2xl sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:w-auto sm:rounded-xl">
      <DialogHeader>
        <DialogTitle>{t("cap.title")}</DialogTitle>
        <DialogDescription>{t("cap.desc")}</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cap-amount">{t("cap.amount")}</Label>
          <CurrencyInput
            id="cap-amount"
            value={amount}
            onValueChange={setAmount}
            placeholder="5.000.000"
            required
            autoFocus
          />
          {minRequired > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("cap.minHint", { amount: formatRupiah(minRequired) })}
            </p>
          )}
          {tooLow && (
            <div className="flex items-start gap-2 text-xs text-warning bg-warning/10 rounded-md p-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{t("cap.tooLow", { amount: formatRupiah(minRequired) })}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {budgetCap !== null && (
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive mr-auto"
              onClick={handleRemove}
            >
              {t("cap.remove")}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={!num || tooLow}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
