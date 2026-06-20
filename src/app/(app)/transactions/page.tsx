"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Combobox, type ComboboxItem } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionDialog } from "@/components/forms/TransactionDialog";
import { MonthPicker, formatMonthLabel } from "@/components/ui/month-picker";
import { formatRupiah, CATEGORY_COLORS } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { Transaction, Wallet } from "@/types";
import { Search, TrendingUp, TrendingDown, Plus, Trash2, PiggyBank, ArrowLeftRight, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { id, enUS } from "date-fns/locale";
import { useTranslation } from "@/lib/i18n/context";

/** The colored type bubble shared by the desktop table and the mobile cards. */
function TxIcon({ tx }: { tx: Transaction }) {
  return (
    <div className={cn(
      "flex items-center justify-center w-7 h-7 rounded-full shrink-0",
      tx.type === "transfer" ? "bg-sky-100" : tx.goal_id ? "bg-violet-100" : tx.type === "income" ? "bg-green-100" : "bg-red-100"
    )}>
      {tx.type === "transfer" ? <ArrowLeftRight className="h-3 w-3 text-sky-600" />
        : tx.goal_id ? <PiggyBank className="h-3 w-3 text-violet-600" />
        : tx.type === "income" ? <TrendingUp className="h-3 w-3 text-green-600" />
        : <TrendingDown className="h-3 w-3 text-red-500" />}
    </div>
  );
}

/** Wallet name, or "from → to" for transfers. */
function TxWallet({ tx, wallets }: { tx: Transaction; wallets: Wallet[] }) {
  const wallet = wallets.find((w) => w.id === tx.wallet_id);
  if (tx.type === "transfer" && tx.transfer_to_wallet_id) {
    const dst = wallets.find((w) => w.id === tx.transfer_to_wallet_id);
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        {wallet ? `${wallet.icon} ${wallet.name}` : "—"}
        <ArrowLeftRight className="h-3 w-3 text-muted-foreground inline" />
        {dst ? `${dst.icon} ${dst.name}` : "—"}
      </span>
    );
  }
  return wallet ? <span>{wallet.icon} {wallet.name}</span> : <span className="text-muted-foreground">—</span>;
}

/** Signed, color-coded amount shared by both layouts. */
function TxAmount({ tx, className }: { tx: Transaction; className?: string }) {
  return (
    <span className={cn(
      "font-semibold tabular-nums",
      tx.type === "income" ? "text-green-600" : tx.type === "transfer" ? "text-sky-600" : "text-foreground",
      className
    )}>
      {tx.type === "income" ? "+" : tx.type === "transfer" ? "" : "-"}{formatRupiah(tx.amount)}
    </span>
  );
}

export default function TransactionsPage() {
  const { transactions, wallets, deleteTransaction, isHydrating } = useStore();
  const { t, locale } = useTranslation();
  const dateLocale = locale === "en" ? enUS : id;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense" | "transfer">("all");
  const [walletFilter, setWalletFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // First narrow by selected month, then apply other filters
  const inMonth = transactions.filter((t) => t.date.startsWith(month));

  const filtered = inMonth.filter((t) => {
    const matchSearch = t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase());
    const matchType = filter === "all" || t.type === filter;
    const matchWallet = walletFilter === "all" || t.wallet_id === walletFilter;
    return matchSearch && matchType && matchWallet;
  });

  const totalIncome = inMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = inMonth.filter((t) => t.type === "expense" && !t.goal_id && !t.transfer_to_wallet_id).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="p-4 sm:p-6 max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">{t("tx.title")}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{t("tx.countLabel", { n: inMonth.length, month: formatMonthLabel(month) })}</p>
        </div>
        <Button size="sm" className="gap-2 shrink-0" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("tx.addManual")}</span>
          <span className="sm:hidden">{t("common.add")}</span>
        </Button>
      </div>

      <MonthPicker value={month} onChange={setMonth} />

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("dashboard.totalIncome")}</p>
              <p className="font-bold text-green-600">{formatRupiah(totalIncome)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("dashboard.totalExpense")}</p>
              <p className="font-bold text-red-500">{formatRupiah(totalExpense)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:flex-wrap">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("tx.search")}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
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
          triggerClassName="w-full sm:w-[180px]"
        />
        {/* Type tabs: scroll horizontally on very narrow screens instead of overflowing */}
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
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm">{t("cat.count", { n: filtered.length })}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop / tablet: table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("tx.col.description")}</TableHead>
                  <TableHead>{t("tx.col.category")}</TableHead>
                  <TableHead>{t("tx.col.wallet")}</TableHead>
                  <TableHead>{t("tx.col.date")}</TableHead>
                  <TableHead className="text-right">{t("tx.col.amount")}</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isHydrating && filtered.length === 0
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-7 w-7 rounded-full" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-7 w-16" /></TableCell>
                      </TableRow>
                    ))
                  : filtered.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TxIcon tx={tx} />
                          {tx.description?.trim() ? (
                            <span className="text-sm font-medium">{tx.description}</span>
                          ) : (
                            <span className="text-sm italic text-muted-foreground/70">
                              {t("tx.noDescription")}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-xs", CATEGORY_COLORS[tx.category] || CATEGORY_COLORS["Lainnya"])}>
                          {tx.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <TxWallet tx={tx} wallets={wallets} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(parseISO(tx.date), "d MMM yyyy", { locale: dateLocale })}
                      </TableCell>
                      <TableCell className="text-right">
                        <TxAmount tx={tx} className="text-sm" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5 justify-end">
                          {tx.type !== "transfer" && !tx.goal_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => setEditTx(tx)}
                              title={t("tx.editTitle")}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteTransaction(tx.id)}
                            title={t("tx.deleteTitle")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: stacked cards (no horizontal scrolling) */}
          <div className="md:hidden divide-y divide-border">
            {isHydrating && filtered.length === 0
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-3">
                    <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              : filtered.map((tx) => (
                <div key={tx.id} className="flex items-start gap-3 p-3">
                  <TxIcon tx={tx} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      {tx.description?.trim() ? (
                        <span className="text-sm font-medium truncate">{tx.description}</span>
                      ) : (
                        <span className="text-sm italic text-muted-foreground/70 truncate">{t("tx.noDescription")}</span>
                      )}
                      <TxAmount tx={tx} className="text-sm shrink-0" />
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className={cn("text-xs", CATEGORY_COLORS[tx.category] || CATEGORY_COLORS["Lainnya"])}>
                        {tx.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground"><TxWallet tx={tx} wallets={wallets} /></span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(tx.date), "d MMM yyyy", { locale: dateLocale })}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {tx.type !== "transfer" && !tx.goal_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => setEditTx(tx)}
                            title={t("tx.editTitle")}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteTransaction(tx.id)}
                          title={t("tx.deleteTitle")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {!isHydrating && filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {t("tx.empty")}
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <TransactionDialog
        open={!!editTx}
        onOpenChange={(o) => !o && setEditTx(null)}
        initial={editTx ?? undefined}
      />
    </div>
  );
}
