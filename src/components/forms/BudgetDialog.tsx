"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox, type ComboboxItem } from "@/components/ui/combobox";
import { Budget } from "@/types";
import { useStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";
import { AlertCircle } from "lucide-react";

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Budget;
}

export function BudgetDialog({
  open,
  onOpenChange,
  initial,
}: BudgetDialogProps) {
  const { addBudget, updateBudget, budgets, categories } = useStore();
  const { t } = useTranslation();
  const isEdit = !!initial;

  const currentMonth = new Date().toISOString().slice(0, 7);

  // Only expense categories, and not internal ones (Tabungan is system-managed)
  const expenseCategories = categories.filter(
    (c) => c.type === "expense" && !c.isInternal,
  );

  // Categories already budgeted for this month (except the one being edited)
  const usedCategories = new Set(
    budgets
      .filter(
        (b) =>
          b.month_year === currentMonth && (!isEdit || b.id !== initial?.id),
      )
      .map((b) => b.category),
  );

  // For new budgets, default to first available category
  const firstAvailable =
    expenseCategories.find((c) => !usedCategories.has(c.name))?.name ||
    expenseCategories[0]?.name ||
    "";

  const [category, setCategory] = useState(initial?.category || firstAvailable);
  const [limit, setLimit] = useState<string>(
    initial?.limit_amount ? String(initial.limit_amount) : "",
  );

  useEffect(() => {
    if (open) {
      setCategory(initial?.category || firstAvailable);
      setLimit(initial?.limit_amount ? String(initial.limit_amount) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const allUsed =
    !isEdit &&
    expenseCategories.length > 0 &&
    expenseCategories.every((c) => usedCategories.has(c.name));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(limit);
    if (!num) return;

    // Guard against duplicates on submit
    if (!isEdit && usedCategories.has(category)) return;

    if (isEdit && initial) {
      updateBudget(initial.id, { category, limit_amount: num });
    } else {
      addBudget({
        category,
        limit_amount: num,
        month_year: currentMonth,
        spent: 0,
      });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("budgetDlg.title.edit") : t("budgetDlg.title.add")}</DialogTitle>
          <DialogDescription>{t("budgetDlg.desc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("tx.col.category")}</Label>
            <Combobox
              value={category}
              onValueChange={setCategory}
              items={expenseCategories
                .filter((c) => !usedCategories.has(c.name))
                .map<ComboboxItem>((c) => ({ value: c.name, label: c.name, icon: c.icon }))}
              placeholder={t("common.pickCategory")}
              searchPlaceholder={t("common.searchCategory")}
              emptyMessage={t("budgetDlg.noCategoryLeft")}
              disabled={isEdit || allUsed}
              triggerClassName="w-full"
            />
            {isEdit && (
              <p className="text-xs text-muted-foreground">{t("budgetDlg.lockedCategory")}</p>
            )}
            {allUsed && (
              <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 rounded-md p-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{t("budgetDlg.allUsed")}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="limit">{t("budgetDlg.limit")}</Label>
            <CurrencyInput
              id="limit"
              value={limit}
              onValueChange={setLimit}
              placeholder="1.500.000"
              required
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!isEdit && allUsed}>
              {isEdit ? t("common.saveChanges") : t("budgetDlg.title.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
