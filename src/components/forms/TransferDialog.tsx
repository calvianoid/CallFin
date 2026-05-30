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
import { Combobox, type ComboboxItem } from "@/components/ui/combobox";
import { useStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";
import { formatRupiah } from "@/lib/mock-data";
import { ArrowRight, Sparkles, ArrowLeftRight } from "lucide-react";

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFromId?: string;
  defaultToId?: string;
  defaultAmount?: number;
  fromAI?: boolean;
  onSaved?: () => void;
}

export function TransferDialog({
  open,
  onOpenChange,
  defaultFromId,
  defaultToId,
  defaultAmount,
  fromAI,
  onSaved,
}: TransferDialogProps) {
  const { wallets, addTransfer } = useStore();
  const { t } = useTranslation();

  const [fromId, setFromId] = useState(defaultFromId || wallets[0]?.id || "");
  const [toId, setToId] = useState(defaultToId || wallets[1]?.id || "");
  const [amount, setAmount] = useState<string>(
    defaultAmount ? String(defaultAmount) : "",
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFromId(defaultFromId || wallets[0]?.id || "");
      // Default destination: first wallet that's NOT the source
      const otherId =
        defaultToId ||
        wallets.find((w) => w.id !== (defaultFromId || wallets[0]?.id))?.id ||
        "";
      setToId(otherId);
      setAmount(defaultAmount ? String(defaultAmount) : "");
      setNote("");
      setError(null);
    }
  }, [open, defaultFromId, defaultToId, defaultAmount, wallets]);

  const fromWallet = wallets.find((w) => w.id === fromId);
  const toWallet = wallets.find((w) => w.id === toId);
  const num = parseFloat(amount) || 0;
  const sameWallet = fromId && toId && fromId === toId;
  const insufficient =
    fromWallet && num > fromWallet.balance && fromWallet.type !== "credit";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!num || !fromId || !toId) return;
    if (sameWallet) {
      setError(t("transferDlg.sameWalletErr"));
      return;
    }
    addTransfer(fromId, toId, num, note || undefined);
    onSaved?.();
    onOpenChange(false);
  }

  function swap() {
    setFromId(toId);
    setToId(fromId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {fromAI ? (
              <Sparkles className="h-4 w-4 text-primary" />
            ) : (
              <ArrowLeftRight className="h-4 w-4 text-primary" />
            )}
            {fromAI ? t("transferDlg.title.ai") : t("transferDlg.title")}
          </DialogTitle>
          <DialogDescription>{t("transferDlg.desc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* From / To with swap button */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
            <div className="space-y-2">
              <Label>{t("transferDlg.from")}</Label>
              <Combobox
                value={fromId}
                onValueChange={setFromId}
                items={wallets.map<ComboboxItem>((w) => ({ value: w.id, label: w.name, icon: w.icon }))}
                placeholder={t("common.pickWallet")}
                searchPlaceholder={t("common.searchWallet")}
                emptyMessage={t("common.noWallet")}
                triggerClassName="w-full"
              />
              {fromWallet && (
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {t("common.balance")}: {formatRupiah(fromWallet.balance)}
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 mb-6"
              onClick={swap}
              title={t("transferDlg.swap")}
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>

            <div className="space-y-2">
              <Label>{t("transferDlg.to")}</Label>
              <Combobox
                value={toId}
                onValueChange={setToId}
                items={wallets
                  .filter((w) => w.id !== fromId)
                  .map<ComboboxItem>((w) => ({ value: w.id, label: w.name, icon: w.icon }))}
                placeholder={t("common.pickWallet")}
                searchPlaceholder={t("common.searchWallet")}
                emptyMessage={t("transferDlg.noOther")}
                triggerClassName="w-full"
              />
              {toWallet && (
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {t("common.balance")}: {formatRupiah(toWallet.balance)}
                </p>
              )}
            </div>
          </div>

          {sameWallet && (
            <p className="text-xs text-destructive">{t("transferDlg.sameWallet")}</p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="space-y-2">
            <Label htmlFor="amount">{t("common.amount")}</Label>
            <CurrencyInput
              id="amount"
              value={amount}
              onValueChange={setAmount}
              placeholder="500.000"
              required
              autoFocus
            />
            {insufficient && (
              <p className="text-xs text-amber-600">{t("transferDlg.notEnough")}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">{t("common.noteOptional")}</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("transferDlg.notePlaceholder")}
            />
          </div>

          {/* Preview */}
          {fromWallet && toWallet && num > 0 && !sameWallet && (
            <div className="bg-muted rounded-lg p-3 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {fromWallet.icon} {fromWallet.name}
                </span>
                <span className="font-medium tabular-nums">
                  {formatRupiah(fromWallet.balance)} →{" "}
                  {formatRupiah(fromWallet.balance - num)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {toWallet.icon} {toWallet.name}
                </span>
                <span className="font-medium tabular-nums">
                  {formatRupiah(toWallet.balance)} →{" "}
                  {formatRupiah(toWallet.balance + num)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!num || !fromId || !toId || !!sameWallet}
            >
              <ArrowRight className="h-3.5 w-3.5 mr-1" />
              {fromAI ? t("transferDlg.submit.ai") : t("transferDlg.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
