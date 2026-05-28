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
import { cn } from "@/lib/utils";

interface WalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Wallet;
}

const WALLET_TYPES: { value: WalletType; label: string; icon: string }[] = [
  { value: "cash", label: "Tunai", icon: "💵" },
  { value: "bank", label: "Bank", icon: "🏦" },
  { value: "ewallet", label: "E-Wallet", icon: "📱" },
  { value: "credit", label: "Kartu Kredit", icon: "💳" },
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
          <DialogTitle>{isEdit ? "Edit Dompet" : "Tambah Dompet"}</DialogTitle>
          <DialogDescription>
            Pisahkan saldo per dompet, akun bank, atau e-wallet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Dompet</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: BCA, OVO, Tunai"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as WalletType)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(v) => {
                      const t = WALLET_TYPES.find((x) => x.value === v);
                      return t ? `${t.icon} ${t.label}` : "";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {WALLET_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="balance">Saldo (Rp)</Label>
              <CurrencyInput
                id="balance"
                value={balance}
                onValueChange={setBalance}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Warna</Label>
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
              Batal
            </Button>
            <Button type="submit">{isEdit ? "Simpan" : "Tambah"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
