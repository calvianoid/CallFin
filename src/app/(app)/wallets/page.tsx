"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WalletDialog } from "@/components/forms/WalletDialog";
import { useStore } from "@/lib/store";
import { Wallet } from "@/types";
import { formatRupiah, WALLET_TYPE_LABEL } from "@/lib/mock-data";
import { Plus, Pencil, Trash2, Wallet as WalletIcon, ArrowDownUp, AlertCircle, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";
import { TransferDialog } from "@/components/forms/TransferDialog";

export default function WalletsPage() {
  const { wallets, transactions, deleteWallet } = useStore();
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<{ open: boolean; editing?: Wallet }>({ open: false });
  const [transferDialog, setTransferDialog] = useState<{ open: boolean; fromId?: string }>({ open: false });

  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);

  function openAdd() {
    setDialog({ open: true });
  }

  function openEdit(w: Wallet) {
    setDialog({ open: true, editing: w });
  }

  function txCount(walletId: string) {
    return transactions.filter((t) => t.wallet_id === walletId).length;
  }

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

  return (
    <div className="p-4 sm:p-6 max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">{t("wallets.title")}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{t("wallets.subtitle")}</p>
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
            <span className="hidden sm:inline">Transfer</span>
          </Button>
          <Button size="sm" className="gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("wallets.add")}</span>
            <span className="sm:hidden">{t("wallets.addShort")}</span>
          </Button>
        </div>
      </div>

      {/* Total balance hero */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownUp className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{t("wallets.total")}</p>
          </div>
          <p className="text-3xl font-bold tabular-nums tracking-tight">{formatRupiah(totalBalance)}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("wallets.totalDesc", { n: wallets.length })}</p>
        </CardContent>
      </Card>

      {/* Wallets grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {wallets.map((w) => {
          const count = txCount(w.id);
          return (
            <Card key={w.id} className="border-border/50 overflow-hidden">
              <CardContent className="p-0">
                {/* Colored top strip */}
                <div className={cn("h-20 relative", w.color)}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/20" />
                  <div className="relative h-full flex items-center justify-between px-4 text-white">
                    <span className="text-3xl">{w.icon}</span>
                    <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-[10px]">
                      {WALLET_TYPE_LABEL[w.type]}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div>
                    <p className="font-semibold truncate">{w.name}</p>
                    <p className={cn(
                      "text-lg font-bold tabular-nums tracking-tight",
                      w.balance < 0 && "text-red-500"
                    )}>
                      {formatRupiah(w.balance)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {count > 0 ? t("wallets.txCount", { n: count }) : t("wallets.noTx")}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1 gap-1 h-8" onClick={() => openEdit(w)}>
                      <Pencil className="h-3 w-3" /> {t("common.edit")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 h-8 text-primary hover:bg-primary/10"
                      onClick={() => setTransferDialog({ open: true, fromId: w.id })}
                      disabled={wallets.length < 2}
                      title="Transfer dari dompet ini"
                    >
                      <ArrowLeftRight className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 h-8 text-muted-foreground hover:text-destructive hover:border-destructive/30"
                      onClick={() => handleDelete(w)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Add wallet card */}
        <button
          onClick={openAdd}
          className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground hover:border-primary hover:text-primary transition-colors min-h-[200px]"
        >
          <Plus className="h-6 w-6" />
          <span className="text-sm font-medium">{t("wallets.addCard")}</span>
        </button>
      </div>

      {wallets.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <WalletIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">{t("wallets.empty")}</p>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1" /> {t("wallets.addFirst")}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            {t("wallets.tips")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs text-muted-foreground">
          <p>• {t("wallets.tip1")}</p>
          <p>• {t("wallets.tip2")}</p>
          <p>• {t("wallets.tip3")}</p>
          <p>• {t("wallets.tip4")}</p>
        </CardContent>
      </Card>

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
