"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryDialog } from "@/components/forms/CategoryDialog";
import { TxViewToggle } from "@/components/transactions/TxViewToggle";
import { useStore } from "@/lib/store";
import { Category, CategoryType } from "@/types";
import { Plus, Trash2 } from "lucide-react";
import { cn, getYearMonth } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

type TFn = ReturnType<typeof useTranslation>["t"];

function CategoryCard({
  c,
  count,
  onEdit,
  onDelete,
  t,
}: {
  c: Category;
  count: number;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
  t: TFn;
}) {
  return (
    <div
      onClick={() => onEdit(c)}
      className="group relative flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 cursor-pointer hover:border-border/80 hover:bg-muted/30 transition-colors"
    >
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0", c.color)}>
        {c.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{c.name}</p>
        <p className={cn("text-xs truncate", c.isDefault ? "text-muted-foreground" : "text-primary")}>
          {c.isDefault ? t("cat.txThisMonth", { n: count }) : t("cat.customTx", { n: count })}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(c);
        }}
        className="absolute top-2 right-2 h-6 w-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
        title={t("cat.deleteOne")}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Section({
  label,
  cats,
  type,
  isHydrating,
  monthTxCount,
  onEdit,
  onDelete,
  onAdd,
  t,
}: {
  label: string;
  cats: Category[];
  type: CategoryType;
  isHydrating: boolean;
  monthTxCount: (name: string) => number;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
  onAdd: (type: CategoryType) => void;
  t: TFn;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      {isHydrating && cats.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {cats.map((c) => (
            <CategoryCard key={c.id} c={c} count={monthTxCount(c.name)} onEdit={onEdit} onDelete={onDelete} t={t} />
          ))}
          <button
            onClick={() => onAdd(type)}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border p-3.5 min-h-[68px] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="text-[11px]">{t("common.add")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  const { categories, transactions, budgets, deleteCategory, isHydrating } = useStore();
  const { t, locale } = useTranslation();
  const [dialog, setDialog] = useState<{ open: boolean; editing?: Category; defaultType?: CategoryType }>({ open: false });

  const month = getYearMonth();
  const userVisible = categories.filter((c) => !c.isInternal);
  const incomeCats = userVisible.filter((c) => c.type === "income");
  const expenseCats = userVisible.filter((c) => c.type === "expense");

  const monthTxCount = (name: string) =>
    transactions.filter((tx) => tx.category === name && tx.date.startsWith(month)).length;

  function handleDelete(c: Category) {
    const txCount = transactions.filter((tx) => tx.category === c.name).length;
    const budgetCount = budgets.filter((b) => b.category === c.name).length;
    if (txCount > 0 || budgetCount > 0) {
      alert(
        locale === "en"
          ? `Category "${c.name}" is still in use (${txCount} transactions, ${budgetCount} budgets). Remove or change them first.`
          : `Kategori "${c.name}" masih dipakai (${txCount} transaksi, ${budgetCount} budget). Hapus atau ubah dulu.`,
      );
      return;
    }
    if (c.isDefault && !confirm(locale === "en" ? `Delete default category "${c.name}"?` : `Hapus kategori default "${c.name}"?`)) return;
    deleteCategory(c.id);
  }

  const onEdit = (c: Category) => setDialog({ open: true, editing: c });
  const onAdd = (type: CategoryType) => setDialog({ open: true, defaultType: type });

  return (
    <div className="p-4 sm:p-6 max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{t("nav.transactions")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("cat.catalogSubtitle", { n: userVisible.length })}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TxViewToggle active="categories" />
          <Button size="sm" className="gap-2" onClick={() => setDialog({ open: true, defaultType: "expense" })}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("cat.addCategory")}</span>
          </Button>
        </div>
      </div>

      <Section
        label={t("tx.tab.expense")}
        cats={expenseCats}
        type="expense"
        isHydrating={isHydrating}
        monthTxCount={monthTxCount}
        onEdit={onEdit}
        onDelete={handleDelete}
        onAdd={onAdd}
        t={t}
      />
      <Section
        label={t("tx.tab.income")}
        cats={incomeCats}
        type="income"
        isHydrating={isHydrating}
        monthTxCount={monthTxCount}
        onEdit={onEdit}
        onDelete={handleDelete}
        onAdd={onAdd}
        t={t}
      />

      <CategoryDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        initial={dialog.editing}
        defaultType={dialog.defaultType}
      />
    </div>
  );
}
