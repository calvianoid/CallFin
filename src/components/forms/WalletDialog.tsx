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
import { Wallet, WalletType } from "@/types";
import { useStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";

interface WalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Wallet;
}

const WALLET_TYPES: { value: WalletType; labelKey: TranslationKey; icon: string }[] = [
  { value: "cash", labelKey: "wallets.type.cash", icon: "💵" },
  { value: "bank", labelKey: "wallets.type.bank", icon: "🏦" },
  { value: "ewallet", labelKey: "wallets.type.ewallet", icon: "📱" },
  { value: "credit", labelKey: "wallets.type.credit", icon: "💳" },
];

const COLOR_OPTIONS = [
  "bg-emerald-500",
  "bg-blue-600",
  "bg-sky-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-teal-500",
  "bg-orange-500",
];

export function WalletDialog({
  open,
  onOpenChange,
  initial,
}: WalletDialogProps) {
  const { addWallet, updateWallet } = useStore();
  const { t } = useTranslation();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name || "");
  const [type, setType] = useState<WalletType>(initial?.type || "cash");
  const [balance, setBalance] = useState<string>(
    initial?.balance ? String(initial.balance) : "0",
  );
  const [color, setColor] = useState(initial?.color || COLOR_OPTIONS[0]);

  useEffect(() => {
    if (open) {
      setName(initial?.name || "");
      setType(initial?.type || "cash");
      setBalance(initial?.balance ? String(initial.balance) : "0");
      setColor(initial?.color || COLOR_OPTIONS[0]);
    }
  }, [open, initial]);

  const icon = WALLET_TYPES.find((t) => t.value === type)?.icon || "💵";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    const payload = {
      name,
      type,
      balance: parseFloat(balance) || 0,
      color,
      icon,
    };

    if (isEdit && initial) {
      updateWallet(initial.id, payload);
    } else {
      addWallet(payload);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("walletDlg.title.edit") : t("walletDlg.title.add")}</DialogTitle>
          <DialogDescription>{t("walletDlg.desc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("walletDlg.name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("walletDlg.namePlaceholder")}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("common.type")}</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as WalletType)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(v) => {
                      const tt = WALLET_TYPES.find((x) => x.value === v);
                      return tt ? `${tt.icon} ${t(tt.labelKey)}` : "";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {WALLET_TYPES.map((tt) => (
                    <SelectItem key={tt.value} value={tt.value}>
                      {tt.icon} {t(tt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="balance">{t("walletDlg.initialBalance")}</Label>
              <CurrencyInput
                id="balance"
                value={balance}
                onValueChange={setBalance}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("common.color")}</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    c,
                    color === c
                      ? "ring-2 ring-offset-2 ring-foreground scale-110"
                      : "hover:scale-105",
                  )}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit">{isEdit ? t("common.save") : t("common.add")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
