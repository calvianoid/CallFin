"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletDialog } from "@/components/forms/WalletDialog";
import { TransferDialog } from "@/components/forms/TransferDialog";
import { useStore } from "@/lib/store";
import { Wallet } from "@/types";
import { formatRupiah, WALLET_TYPE_LABEL } from "@/lib/mock-data";
import { formatMonthLabel } from "@/components/ui/month-picker";
import {
  Plus, Trash2, ArrowLeftRight, Landmark, Banknote, Smartphone, CreditCard,
  Wallet as WalletIcon,
} from "lucide-react";
import { cn, getYearMonth } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { id, enUS } from "date-fns/locale";
import { useTranslation } from "@/lib/i18n/context";
import Link from "next/link";

const WALLET_ICON: Record<Wallet["type"], typeof WalletIcon> = {
  bank: Landmark,
  cash: Banknote,
  ewallet: Smartphone,
  credit: CreditCard,
};

function walletSubLabel(w: Wallet): string {
  if (w.account_number) return `•••• ${w.account_number}`;
  if (w.subtitle) return w.subtitle;
  return WALLET_TYPE_LABEL[w.type] ?? "";
}

export default function WalletsPage() {
  const { wallets, transactions, deleteWallet, isHydrating } = useStore();
  const { t, locale } = useTranslation();
  const dateLocale = locale === "en" ? enUS : id;
  const [dialog, setDialog] = useState<{ open: boolean; editing?: Wallet }>({ open: false });
  const [transferDialog, setTransferDialog] = useState<{ open: boolean; fromId?: string }>({ open: false });

  const month = getYearMonth();
  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
  const primaryId = wallets.find((w) => w.type === "bank")?.id ?? wallets[0]?.id;

  const txCount = (walletId: string) => transactions.filter((tx) => tx.wallet_id === walletId).length;

  // In/out flow per wallet for the current month (matches the design's activity list).
  const activity = useMemo(() => {
    const rows = wallets.map((w) => {
      let inc = 0;
      let out = 0;
      for (const tx of transactions) {
        if (!tx.date.startsWith(month) || tx.wallet_id !== w.id) continue;
        // Transfers are shown separately ("Transfer terakhir"), so the in/out
        // bars reflect real income vs spending only.
        if (tx.type === "income") inc += tx.amount;
        else if (tx.type === "expense") out += tx.amount;
      }
      return { w, inc, out };
    });
    return rows.filter((r) => r.inc > 0 || r.out > 0).sort((a, b) => b.inc + b.out - (a.inc + a.out));
  }, [wallets, transactions, month]);
  const maxFlow = Math.max(1, ...activity.map((a) => a.inc + a.out));

  const transfers = useMemo(
    () =>
      transactions
        .filter((tx) => tx.type === "transfer")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6),
    [transactions],
  );

  function handleDelete(w: Wallet) {
    const count = txCount(w.id);
    if (count > 0) {
      alert(`Dompet "${w.name}" masih dipakai oleh ${count} transaksi. Hapus atau pindahkan transaksinya dulu.`);
      return;
    }
    if (wallets.length <= 1) {
      alert("Minimal harus ada 1 dompet.");
      return;
    }
    if (!confirm(`Hapus dompet "${w.name}"?`)) return;
    deleteWallet(w.id);
  }

  const stripNum = (n: number) => formatRupiah(Math.abs(n)).replace(/^Rp\s?/, "");

  return (
    <div className="p-4 sm:p-6 max-w-6xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{t("wallets.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("wallets.headerCount", { n: wallets.length, total: formatRupiah(totalBalance) })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => setTransferDialog({ open: true })}
            disabled={wallets.length < 2}
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden sm:inline">{t("wallets.transferBtn")}</span>
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setDialog({ open: true })}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("wallets.add")}</span>
            <span className="sm:hidden">{t("wallets.addShort")}</span>
          </Button>
        </div>
      </div>

      {/* Wallet cards */}
      {isHydrating && wallets.length === 0 ? (
        <div className="flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="min-w-[150px] h-[104px] rounded-2xl shrink-0" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-5">
          {wallets.map((w) => {
            const primary = w.id === primaryId;
            const Icon = WALLET_ICON[w.type] ?? WalletIcon;
            return (
              <div
                key={w.id}
                onClick={() => setDialog({ open: true, editing: w })}
                className={cn(
                  "group relative cursor-pointer min-w-[168px] lg:min-w-0 shrink-0 rounded-2xl p-4 flex flex-col justify-between min-h-[104px] transition-transform duration-200 hover:-translate-y-0.5",
                  primary ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-card border border-border hover:border-border/80",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-sm font-medium truncate", primary ? "text-primary-foreground" : "text-foreground")}>{w.name}</p>
                  <Icon className={cn("h-4 w-4 shrink-0", primary ? "text-primary-foreground/80" : "text-muted-foreground")} />
                </div>
                <div className="space-y-1">
                  <p className={cn("text-[10px] font-medium uppercase tracking-[0.12em] font-num", primary ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {walletSubLabel(w)}
                  </p>
                  <p className={cn("text-lg font-semibold font-num tracking-tight", primary ? "text-primary-foreground" : w.balance < 0 ? "text-destructive" : "text-foreground")}>
                    {formatRupiah(w.balance)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(w);
                  }}
                  className={cn(
                    "absolute top-2 right-2 h-6 w-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                    primary ? "hover:bg-primary-foreground/15 text-primary-foreground/80" : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive",
                  )}
                  title={t("common.delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity + recent transfers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start">
        {/* Aktivitas per dompet */}
        <Card className="border-border/50 p-0 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border/50">
            <p className="text-sm font-semibold">{t("wallets.activityTitle", { month: formatMonthLabel(month) })}</p>
            <span className="text-xs text-muted-foreground">{t("wallets.inOutLabel")}</span>
          </div>
          <div className="p-4 space-y-4">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t("wallets.noTx")}</p>
            ) : (
              activity.map(({ w, inc, out }) => (
                <div key={w.id} className="flex items-center gap-3">
                  <span className="text-sm flex-1 sm:flex-none sm:w-24 min-w-0 shrink-0 truncate">{w.name}</span>
                  <div className="hidden sm:flex flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-positive" style={{ width: `${(inc / maxFlow) * 100}%` }} />
                    <div className="h-full bg-destructive" style={{ width: `${(out / maxFlow) * 100}%` }} />
                  </div>
                  <span className="text-xs font-num text-positive w-20 sm:w-24 text-right shrink-0">+{stripNum(inc)}</span>
                  <span className="text-xs font-num text-destructive w-20 sm:w-24 text-right shrink-0">-{stripNum(out)}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Transfer terakhir */}
        <Card className="border-border/50 p-0 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border/50">
            <p className="text-sm font-semibold">{t("wallets.recentTransfers")}</p>
            <Link href="/transactions" className="text-xs text-primary font-medium hover:underline">
              {t("dashboard.viewAll")}
            </Link>
          </div>
          {transfers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("wallets.noTransfers")}</p>
          ) : (
            <div className="divide-y divide-border/50">
              {transfers.map((tx) => {
                const from = wallets.find((w) => w.id === tx.wallet_id);
                const to = wallets.find((w) => w.id === tx.transfer_to_wallet_id);
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted shrink-0">
                      <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {from?.name ?? "—"} → {to?.name ?? "—"}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {format(parseISO(tx.date), "d MMM", { locale: dateLocale })}
                        {tx.description?.trim() ? ` · ${tx.description}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-semibold font-num tracking-tight shrink-0">{stripNum(tx.amount)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <WalletDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog({ open: o, editing: undefined })}
        initial={dialog.editing}
      />
      <TransferDialog
        open={transferDialog.open}
        onOpenChange={(o) => setTransferDialog({ open: o, fromId: undefined })}
        defaultFromId={transferDialog.fromId}
      />
    </div>
  );
}
