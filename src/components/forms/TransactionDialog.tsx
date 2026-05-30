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
              ? "Konfirmasi Transaksi dari AI"
              : isEdit
                ? "Edit Transaksi"
                : "Tambah Transaksi"}
          </DialogTitle>
          <DialogDescription>
            {fromAI
              ? "AI berhasil membaca transaksimu. Cek dan ubah jika perlu, lalu konfirmasi."
              : isEdit
                ? "Ubah detail transaksi. Saldo dompet & budget akan disesuaikan otomatis."
                : "Catat pemasukan atau pengeluaranmu secara manual."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs
            value={type}
            onValueChange={(v) => setType(v as TransactionType)}
          >
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="expense">📉 Pengeluaran</TabsTrigger>
              <TabsTrigger value="income">📈 Pemasukan</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="amount">Jumlah (Rp)</Label>
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
              <Label>Kategori</Label>
              <Combobox
                value={category}
                onValueChange={setCategory}
                items={availableCategories.map<ComboboxItem>((c) => ({ value: c.name, label: c.name, icon: c.icon }))}
                placeholder="Pilih kategori"
                searchPlaceholder="Cari kategori..."
                emptyMessage="Tidak ada kategori."
                triggerClassName="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Dompet</Label>
              <Combobox
                value={walletId}
                onValueChange={setWalletId}
                items={wallets.map<ComboboxItem>((w) => ({ value: w.id, label: w.name, icon: w.icon }))}
                placeholder="Pilih dompet"
                searchPlaceholder="Cari dompet..."
                emptyMessage="Tidak ada dompet."
                triggerClassName="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Makan siang di warung Padang"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Tanggal</Label>
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
              Batal
            </Button>
            <Button type="submit">
              {fromAI
                ? "Konfirmasi & Simpan"
                : isEdit
                  ? "Simpan Perubahan"
                  : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
