"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox, type ComboboxItem } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionDialog } from "@/components/forms/TransactionDialog";
import { TxViewToggle } from "@/components/transactions/TxViewToggle";
import { MonthPicker, formatMonthLabel } from "@/components/ui/month-picker";
import { formatRupiah } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { Transaction, Wallet } from "@/types";
import Link from "next/link";
import {
  Search,
  Plus,
  Trash2,
  PiggyBank,
  ArrowLeftRight,
  Pencil,
  Upload,
  Receipt,
  ArrowDownLeft,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn, getYearMonth } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { id, enUS } from "date-fns/locale";
import { useTranslation } from "@/lib/i18n/context";

/** Uniform muted icon square — matches the design's calm row leading icon. */
function TxIcon({ tx }: { tx: Transaction }) {
  const Icon =
    tx.type === "transfer"
      ? ArrowLeftRight
      : tx.goal_id
        ? PiggyBank
        : tx.type === "income"
          ? ArrowDownLeft
          : Receipt;
  const tone =
    tx.type === "income"
      ? "text-positive"
      : tx.type === "transfer" || tx.goal_id
        ? "text-primary"
        : "text-muted-foreground";
  return (
    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted shrink-0">
      <Icon className={cn("h-4 w-4", tone)} />
    </div>
  );
}

function TxWallet({ tx, wallets }: { tx: Transaction; wallets: Wallet[] }) {
  const wallet = wallets.find((w) => w.id === tx.wallet_id);
  if (tx.type === "transfer" && tx.transfer_to_wallet_id) {
    const dst = wallets.find((w) => w.id === tx.transfer_to_wallet_id);
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        {wallet?.name ?? "—"}
        <ArrowLeftRight className="h-3 w-3 inline" />
        {dst?.name ?? "—"}
      </span>
    );
  }
  return <span>{wallet?.name ?? "—"}</span>;
}

/** Signed amount, "Rp" stripped to match the design's dense readout. */
function TxAmount({ tx, className }: { tx: Transaction; className?: string }) {
  const sign = tx.type === "income" ? "+" : tx.type === "transfer" ? "" : "-";
  return (
    <span
      className={cn(
        "font-semibold font-num tracking-tight tabular-nums",
        tx.type === "income" ? "text-positive" : tx.type === "transfer" ? "text-primary" : "text-foreground",
        className,
      )}
    >
      {sign}
      {formatRupiah(tx.amount).replace(/^Rp\s?/, "")}
    </span>
  );
}

export default function TransactionsPage() {
  const { transactions, wallets, categories, deleteTransaction, isHydrating } = useStore();
  const { t, locale } = useTranslation();
  const dateLocale = locale === "en" ? enUS : id;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense" | "transfer">("all");
  const [walletFilter, setWalletFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [month, setMonth] = useState(() => getYearMonth());
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount =
    (walletFilter !== "all" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0) +
    (filter !== "all" ? 1 : 0);

  function resetFilters() {
    setWalletFilter("all");
    setCategoryFilter("all");
    setFilter("all");
  }

  const inMonth = transactions.filter((tx) => tx.date.startsWith(month));

  const filtered = inMonth.filter((tx) => {
    const matchSearch =
      tx.description.toLowerCase().includes(search.toLowerCase()) ||
      tx.category.toLowerCase().includes(search.toLowerCase());
    const matchType = filter === "all" || tx.type === filter;
    const matchWallet = walletFilter === "all" || tx.wallet_id === walletFilter;
    const matchCategory = categoryFilter === "all" || tx.category === categoryFilter;
    return matchSearch && matchType && matchWallet && matchCategory;
  });

  const totalIncome = inMonth.filter((tx) => tx.type === "income").reduce((s, tx) => s + tx.amount, 0);
  const totalExpense = inMonth
    .filter((tx) => tx.type === "expense" && !tx.goal_id && !tx.transfer_to_wallet_id)
    .reduce((s, tx) => s + tx.amount, 0);
  const net = totalIncome - totalExpense;

  // Group filtered transactions by day, newest day first. Computed inline so
  // the React Compiler can memoize it (a manual useMemo here can't be preserved
  // because `filtered` is itself recomputed each render).
  const groupMap = new Map<string, Transaction[]>();
  for (const tx of filtered) {
    const arr = groupMap.get(tx.date);
    if (arr) arr.push(tx);
    else groupMap.set(tx.date, [tx]);
  }
  const groups = [...groupMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  const dayTotal = (txs: Transaction[]) =>
    txs.reduce((s, tx) => (tx.type === "income" ? s + tx.amount : tx.type === "expense" ? s - tx.amount : s), 0);

  const categoryItems: ComboboxItem[] = [
    { value: "all", label: t("tx.allCategories") },
    ...categories
      .filter((c) => !c.isInternal)
      .map<ComboboxItem>((c) => ({ value: c.name, label: c.name, icon: c.icon })),
  ];

  return (
    <div className="p-4 sm:p-6 max-w-6xl space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{t("nav.transactions")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatMonthLabel(month)} · {t("tx.txCount", { n: inMonth.length })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TxViewToggle active="list" />
          <Link href="/import" className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-2")}>
            <Upload className="h-4 w-4" />
            <span className="hidden md:inline">Import</span>
          </Link>
          <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tx.recordTx")}</span>
          </Button>
        </div>
      </div>

      <MonthPicker value={month} onChange={setMonth} />

      {/* Filters + Net */}
      <div className="space-y-2">
        {/* Row 1: search · filter toggle · net — always visible */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("tx.search")} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button
            variant="outline"
            size="default"
            onClick={() => setShowFilters((v) => !v)}
            className={cn("gap-2 shrink-0", showFilters && "border-primary/50 bg-primary/5")}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tx.filter")}</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-medium text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <div className="hidden lg:block text-sm text-muted-foreground whitespace-nowrap">
            {t("tx.net")} {formatMonthLabel(month)}:{" "}
            <span className={cn("font-num font-semibold tracking-tight", net >= 0 ? "text-positive" : "text-destructive")}>
              {net >= 0 ? "+" : "-"}
              {formatRupiah(Math.abs(net)).replace(/^Rp\s?/, "")}
            </span>
          </div>
        </div>

        {/* Net on smaller screens */}
        <div className="lg:hidden text-sm text-muted-foreground">
          {t("tx.net")} {formatMonthLabel(month)}:{" "}
          <span className={cn("font-num font-semibold tracking-tight", net >= 0 ? "text-positive" : "text-destructive")}>
            {net >= 0 ? "+" : "-"}
            {formatRupiah(Math.abs(net)).replace(/^Rp\s?/, "")}
          </span>
        </div>

        {/* Row 2: advanced filters — collapsible */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <Combobox
                value={walletFilter}
                onValueChange={(v) => setWalletFilter(v || "all")}
                items={[
                  { value: "all", label: t("tx.allWallets") } as ComboboxItem,
                  ...wallets.map<ComboboxItem>((w) => ({ value: w.id, label: w.name, icon: w.icon })),
                ]}
                placeholder={t("tx.allWallets")}
                searchPlaceholder={t("common.searchWallet")}
                emptyMessage={t("common.noWallet")}
                triggerClassName="w-[150px]"
              />
              <Combobox
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v || "all")}
                items={categoryItems}
                placeholder={t("tx.allCategories")}
                searchPlaceholder={t("tx.allCategories")}
                emptyMessage={t("tx.empty")}
                triggerClassName="w-[160px]"
              />
            </div>
            <div className="-mx-1 px-1 overflow-x-auto">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <TabsList className="w-max">
                  <TabsTrigger value="all">{t("tx.tab.all")}</TabsTrigger>
                  <TabsTrigger value="income">{t("tx.tab.income")}</TabsTrigger>
                  <TabsTrigger value="expense">{t("tx.tab.expense")}</TabsTrigger>
                  <TabsTrigger value="transfer">{t("tx.tab.transfer")}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="gap-1 text-muted-foreground sm:ml-auto"
              >
                <X className="h-3.5 w-3.5" />
                {t("tx.reset")}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Grouped list */}
      {isHydrating && filtered.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[60px] w-full rounded-xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">{t("tx.empty")}</div>
      ) : (
        <div className="space-y-5">
          {groups.map(([date, txs]) => {
            const total = dayTotal(txs);
            return (
              <div key={date} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {format(parseISO(date), "EEEE, d MMMM", { locale: dateLocale })}
                  </p>
                  <span
                    className={cn(
                      "text-sm font-num font-medium tracking-tight",
                      total >= 0 ? "text-positive" : "text-muted-foreground",
                    )}
                  >
                    {total >= 0 ? "+" : "-"}
                    {formatRupiah(Math.abs(total)).replace(/^Rp\s?/, "")}
                  </span>
                </div>
                <Card className="border-border/50 divide-y divide-border/50 p-0 overflow-hidden">
                  {txs.map((tx) => {
                    const editable = tx.type !== "transfer" && !tx.goal_id;
                    return (
                      <div
                        key={tx.id}
                        onClick={editable ? () => setEditTx(tx) : undefined}
                        className={cn(
                          "group flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-muted/40 transition-colors",
                          editable && "cursor-pointer sm:cursor-default",
                        )}
                      >
                        <TxIcon tx={tx} />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium truncate", !tx.description?.trim() && "italic text-muted-foreground/70")}>
                            {tx.description?.trim() || t("tx.noDescription")}
                          </p>
                          <div className="flex items-center gap-2 mt-1 sm:hidden">
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap">{tx.category}</span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              <TxWallet tx={tx} wallets={wallets} />
                            </span>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-3 shrink-0">
                          <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground whitespace-nowrap">{tx.category}</span>
                          <span className="text-sm text-muted-foreground min-w-[90px] truncate">
                            <TxWallet tx={tx} wallets={wallets} />
                          </span>
                        </div>
                        <TxAmount tx={tx} className="text-sm shrink-0 sm:min-w-[110px] text-right" />
                        <div className="hidden sm:flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {editable && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditTx(tx);
                              }}
                              title={t("tx.editTitle")}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTransaction(tx.id);
                            }}
                            title={t("tx.deleteTitle")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <TransactionDialog open={!!editTx} onOpenChange={(o) => !o && setEditTx(null)} initial={editTx ?? undefined} />
    </div>
  );
}
