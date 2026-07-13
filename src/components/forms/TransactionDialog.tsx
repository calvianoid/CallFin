"use client";

import { useMemo, useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Transaction, TransactionType } from "@/types";
import { useStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";
import { cn, getLocalDate } from "@/lib/utils";
import { Sparkles, ChevronDown } from "lucide-react";

/** Remember the last wallet used for a manual entry so it's pre-selected next time. */
const LAST_WALLET_KEY = "callfin.lastWallet";
const TOP_CATEGORIES = 8;

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<Transaction>;
  fromAI?: boolean;
  onSaved?: (tx: Transaction) => void;
}

export function TransactionDialog({ open, onOpenChange, ...formProps }: TransactionDialogProps) {
  // The form only mounts while the dialog is open, so its useState
  // initializers re-run on every open — no reset effect needed.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <TransactionForm onOpenChange={onOpenChange} {...formProps} />}
    </Dialog>
  );
}

function TransactionForm({
  onOpenChange,
  initial,
  fromAI,
  onSaved,
}: Omit<TransactionDialogProps, "open">) {
  const { wallets, categories, transactions, addTransaction, updateTransaction } = useStore();
  const { t } = useTranslation();
  const isEdit = !!initial?.id;

  // Categories for a type, most-used first (so the common ones surface as the
  // first chips). Frequency is derived from the user's transaction history.
  const orderedCatsFor = useMemo(() => {
    const freq = new Map<string, number>();
    for (const tx of transactions) {
      const key = `${tx.type}:${tx.category}`;
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
    return (ty: TransactionType) =>
      categories
        .filter((c) => c.type === ty && !c.isInternal)
        .sort((a, b) => (freq.get(`${ty}:${b.name}`) ?? 0) - (freq.get(`${ty}:${a.name}`) ?? 0));
  }, [transactions, categories]);

  const [type, setType] = useState<TransactionType>(initial?.type || "expense");
  const [amount, setAmount] = useState<string>(initial?.amount ? String(initial.amount) : "");
  const [category, setCategory] = useState(
    initial?.category || orderedCatsFor(initial?.type || "expense")[0]?.name || "",
  );
  const [walletId, setWalletId] = useState(() => {
    if (initial?.wallet_id && wallets.some((w) => w.id === initial.wallet_id)) return initial.wallet_id;
    try {
      const last = localStorage.getItem(LAST_WALLET_KEY);
      if (last && wallets.some((w) => w.id === last)) return last;
    } catch {
      /* localStorage unavailable — fall through */
    }
    return wallets[0]?.id || "";
  });
  const [description, setDescription] = useState(initial?.description || "");
  const [date, setDate] = useState(initial?.date || getLocalDate());
  const [showAllCats, setShowAllCats] = useState(false);
  // Editing an existing tx? Show the detail fields up front so they're editable.
  const [showDetail, setShowDetail] = useState(isEdit);

  const orderedCats = orderedCatsFor(type);
  const topCats = orderedCats.slice(0, TOP_CATEGORIES);
  // Keep the selected category visible even if it's outside the top slice.
  const selectedOutsideTop =
    category && !topCats.some((c) => c.name === category)
      ? orderedCats.find((c) => c.name === category)
      : undefined;
  const visibleCats = showAllCats
    ? orderedCats
    : selectedOutsideTop
      ? [selectedOutsideTop, ...topCats.slice(0, TOP_CATEGORIES - 1)]
      : topCats;
  const hiddenCount = orderedCats.length - visibleCats.length;

  function handleTypeChange(v: unknown) {
    const newType = v as TransactionType;
    setType(newType);
    const list = orderedCatsFor(newType);
    if (!list.some((c) => c.name === category)) setCategory(list[0]?.name || "");
    setShowAllCats(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || !walletId || !category) return;
    try {
      localStorage.setItem(LAST_WALLET_KEY, walletId);
    } catch {
      /* ignore */
    }

    const payload = {
      type,
      amount: numAmount,
      category,
      description: description || category,
      date,
      wallet_id: walletId,
    };
    if (isEdit && initial?.id) {
      updateTransaction(initial.id, payload);
      onOpenChange(false);
      return;
    }
    const tx = addTransaction(payload);
    onSaved?.(tx);
    onOpenChange(false);
  }

  return (
    <DialogContent className="top-auto bottom-0 left-0 translate-x-0 translate-y-0 max-w-full w-full rounded-b-none rounded-t-2xl max-h-[88dvh] overflow-y-auto sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:w-auto sm:rounded-xl sm:max-h-[85vh]">
        <div className="sm:hidden mx-auto -mt-1 mb-1 h-1 w-10 rounded-full bg-border" />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {fromAI && <Sparkles className="h-4 w-4 text-primary" />}
            {fromAI ? t("txDlg.title.ai") : isEdit ? t("txDlg.title.edit") : t("txDlg.title.add")}
          </DialogTitle>
          <DialogDescription>
            {fromAI ? t("txDlg.desc.ai") : isEdit ? t("txDlg.desc.edit") : t("txDlg.desc.add")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={type} onValueChange={handleTypeChange}>
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
              className="h-12 text-lg font-num"
            />
          </div>

          {/* Category — one-tap chips (most-used first). When expanded the
              list scrolls in place so the dialog never outgrows the screen. */}
          <div className="space-y-2">
            <Label>{t("tx.col.category")}</Label>
            <div className={cn("flex flex-wrap gap-2", showAllCats && "max-h-44 overflow-y-auto pr-1")}>
              {visibleCats.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setCategory(c.name)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    category === c.name
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-foreground hover:bg-muted",
                  )}
                >
                  {c.icon && <span className="leading-none">{c.icon}</span>}
                  {c.name}
                </button>
              ))}
              {!showAllCats && hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllCats(true)}
                  className="inline-flex items-center rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
                >
                  {t("txDlg.moreCats", { n: hiddenCount })}
                </button>
              )}
            </div>
          </div>

          {/* Wallet — pills, defaults to the last one used */}
          <div className="space-y-2">
            <Label>{t("tx.col.wallet")}</Label>
            <div className="flex flex-wrap gap-2">
              {wallets.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWalletId(w.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    walletId === w.id
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-foreground hover:bg-muted",
                  )}
                >
                  {w.icon && <span className="leading-none">{w.icon}</span>}
                  {w.name}
                </button>
              ))}
            </div>
          </div>

          {/* Optional details — collapsed by default */}
          <div>
            <button
              type="button"
              onClick={() => setShowDetail((v) => !v)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", showDetail && "rotate-180")} />
              {t("txDlg.addDetail")}
            </button>
            {showDetail && (
              <div className="space-y-4 pt-3">
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
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit">
              {fromAI ? t("txDlg.submit.ai") : isEdit ? t("common.saveChanges") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
    </DialogContent>
  );
}
