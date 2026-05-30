"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryDialog } from "@/components/forms/CategoryDialog";
import { useStore } from "@/lib/store";
import { Category, CategoryType } from "@/types";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

export default function CategoriesPage() {
  const { categories, transactions, budgets, deleteCategory, isHydrating } = useStore();
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<{ open: boolean; editing?: Category; defaultType?: CategoryType }>({ open: false });

  const userVisible = categories.filter((c) => !c.isInternal);
  const incomeCats = userVisible.filter((c) => c.type === "income");
  const expenseCats = userVisible.filter((c) => c.type === "expense");

  function openAdd(defaultType: CategoryType) {
    setDialog({ open: true, defaultType });
  }
  function openEdit(c: Category) {
    setDialog({ open: true, editing: c });
  }

  function usage(c: Category) {
    const txCount = transactions.filter((t) => t.category === c.name).length;
    const budgetCount = budgets.filter((b) => b.category === c.name).length;
    return { txCount, budgetCount };
  }

  function handleDelete(c: Category) {
    const u = usage(c);
    if (u.txCount > 0 || u.budgetCount > 0) {
      alert(`Kategori "${c.name}" masih dipakai (${u.txCount} transaksi, ${u.budgetCount} budget). Hapus atau ubah dulu yang pakai kategori ini.`);
      return;
    }
    if (c.isDefault) {
      if (!confirm(`Hapus kategori default "${c.name}"? Bisa kamu tambahkan lagi nanti.`)) return;
    }
    deleteCategory(c.id);
  }

  function renderCategory(c: Category) {
    const u = usage(c);
    const inUse = u.txCount > 0 || u.budgetCount > 0;
    return (
      <div
        key={c.id}
        className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors"
      >
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0", c.color)}>
          {c.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold truncate">{c.name}</p>
            {c.isDefault && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{t("cat.default")}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {u.txCount > 0 && <span>{u.txCount} {t("nav.transactions").toLowerCase()}</span>}
            {u.txCount > 0 && u.budgetCount > 0 && <span> · </span>}
            {u.budgetCount > 0 && <span>{u.budgetCount} {t("nav.budgets").toLowerCase()}</span>}
            {!inUse && <span>{t("cat.unused")}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => handleDelete(c)}
            title={inUse ? "Tidak bisa dihapus — masih dipakai" : "Hapus kategori"}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl space-y-5">
      <div>
        <h1 className="text-lg sm:text-xl font-bold">{t("cat.title")}</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">{t("cat.subtitle", { n: userVisible.length })}</p>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <p>{t("cat.info")}</p>
      </div>

      {/* Expense */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              {t("cat.expense")}
            </CardTitle>
            <CardDescription>{t("cat.count", { n: expenseCats.length })}</CardDescription>
          </div>
          <Button size="sm" className="gap-1 shrink-0" onClick={() => openAdd("expense")}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("common.add")}</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {isHydrating && expenseCats.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-2.5 w-32" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            ))
          ) : expenseCats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t("cat.emptyExpense")}</p>
          ) : (
            expenseCats.map(renderCategory)
          )}
        </CardContent>
      </Card>

      {/* Income */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              {t("cat.income")}
            </CardTitle>
            <CardDescription>{t("cat.count", { n: incomeCats.length })}</CardDescription>
          </div>
          <Button size="sm" className="gap-1 shrink-0" onClick={() => openAdd("income")}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("common.add")}</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {isHydrating && incomeCats.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-2.5 w-32" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            ))
          ) : incomeCats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t("cat.emptyIncome")}</p>
          ) : (
            incomeCats.map(renderCategory)
          )}
        </CardContent>
      </Card>

      <CategoryDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        initial={dialog.editing}
        defaultType={dialog.defaultType}
      />
    </div>
  );
}
