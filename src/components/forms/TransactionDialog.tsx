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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Transaction, TransactionType } from "@/types";
import { useStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";
import { Sparkles } from "lucide-react";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<Transaction>;
  fromAI?: boolean;
  onSaved?: (tx: Transaction) => void;
}

export function TransactionDialog({
  open,
  onOpenChange,
  initial,
  fromAI,
  onSaved,
}: TransactionDialogProps) {
  const { wallets, categories, addTransaction, updateTransaction } = useStore();
  const { t } = useTranslation();
  const isEdit = !!initial?.id;

  const [type, setType] = useState<TransactionType>(initial?.type || "expense");
  const [amount, setAmount] = useState<string>(
    initial?.amount ? String(initial.amount) : "",
  );

  // Categories filtered by current transaction type (no internal categories)
  const availableCategories = categories.filter(
    (c) => c.type === type && !c.isInternal,
  );
  const defaultCat = (t: TransactionType) =>
    categories.find((c) => c.type === t && !c.isInternal)?.name || "";

  const [category, setCategory] = useState(
    initial?.category || defaultCat(initial?.type || "expense"),
  );
  const [walletId, setWalletId] = useState(
    initial?.wallet_id || wallets[0]?.id || "",
  );
  const [description, setDescription] = useState(initial?.description || "");
  const [date, setDate] = useState(
    initial?.date || new Date().toISOString().split("T")[0],
  );

  useEffect(() => {
    if (open) {
      const initType = initial?.type || "expense";
      setType(initType);
      setAmount(initial?.amount ? String(initial.amount) : "");
      setCategory(initial?.category || defaultCat(initType));
      // Only use initial wallet_id if it exists in the wallets list
      const validWalletId =
        initial?.wallet_id && wallets.some((w) => w.id === initial.wallet_id)
          ? initial.wallet_id
          : wallets[0]?.id || "";
      setWalletId(validWalletId);
      setDescription(initial?.description || "");
      setDate(initial?.date || new Date().toISOString().split("T")[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, wallets]);

  // When user toggles type, reset category to a valid one for the new type
  useEffect(() => {
    if (!open) return;
    if (!availableCategories.some((c) => c.name === category)) {
      setCategory(availableCategories[0]?.name || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || !walletId) return;

    if (isEdit && initial?.id) {
      updateTransaction(initial.id, {
        type,
        amount: numAmount,
        category,
        description: description || category,
        date,
        wallet_id: walletId,
      });
      onOpenChange(false);
      return;
    }

    const tx = addTransaction({
      type,
      amount: numAmount,
      category,
      description: description || category,
      date,
      wallet_id: walletId,
    });

    onSaved?.(tx);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {fromAI && <Sparkles className="h-4 w-4 text-primary" />}
            {fromAI
              ? t("txDlg.title.ai")
              : isEdit
                ? t("txDlg.title.edit")
                : t("txDlg.title.add")}
          </DialogTitle>
          <DialogDescription>
            {fromAI
              ? t("txDlg.desc.ai")
              : isEdit
                ? t("txDlg.desc.edit")
                : t("txDlg.desc.add")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs
            value={type}
            onValueChange={(v) => setType(v as TransactionType)}
          >
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="expense">{t("txDlg.expense")}</TabsTrigger>
              <TabsTrigger value="income">{t("txDlg.income")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="amount">{t("common.amount")}</Label>
            <CurrencyInput
              id="amount"
              value={amount}
              onValueChange={setAmount}
              placeholder="50.000"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("tx.col.category")}</Label>
              <Combobox
                value={category}
                onValueChange={setCategory}
                items={availableCategories.map<ComboboxItem>((c) => ({ value: c.name, label: c.name, icon: c.icon }))}
                placeholder={t("common.pickCategory")}
                searchPlaceholder={t("common.searchCategory")}
                emptyMessage={t("common.noCategory")}
                triggerClassName="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("tx.col.wallet")}</Label>
              <Combobox
                value={walletId}
                onValueChange={setWalletId}
                items={wallets.map<ComboboxItem>((w) => ({ value: w.id, label: w.name, icon: w.icon }))}
                placeholder={t("common.pickWallet")}
                searchPlaceholder={t("common.searchWallet")}
                emptyMessage={t("common.noWallet")}
                triggerClassName="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("common.description")}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("txDlg.descPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">{t("common.date")}</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
            <Button type="submit">
              {fromAI
                ? t("txDlg.submit.ai")
                : isEdit
                  ? t("common.saveChanges")
                  : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
