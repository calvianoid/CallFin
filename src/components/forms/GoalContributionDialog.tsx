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
import { formatRupiah } from "@/lib/mock-data";
import { PiggyBank, Sparkles } from "lucide-react";

interface GoalContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId?: string;
  /** Pre-fill amount & wallet (e.g. from chat parser) */
  defaultAmount?: number;
  defaultWalletId?: string;
  fromAI?: boolean;
  onSaved?: () => void;
}

export function GoalContributionDialog({
  open,
  onOpenChange,
  goalId,
  defaultAmount,
  defaultWalletId,
  fromAI,
  onSaved,
}: GoalContributionDialogProps) {
  const { goals, wallets, addGoalContribution } = useStore();

  const [selectedGoalId, setSelectedGoalId] = useState(
    goalId || goals[0]?.id || "",
  );
  const [walletId, setWalletId] = useState(
    defaultWalletId || wallets[0]?.id || "",
  );
  const [amount, setAmount] = useState<string>(
    defaultAmount ? String(defaultAmount) : "",
  );
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedGoalId(goalId || goals[0]?.id || "");
      setWalletId(defaultWalletId || wallets[0]?.id || "");
      setAmount(defaultAmount ? String(defaultAmount) : "");
      setNote("");
    }
  }, [open, goalId, defaultWalletId, defaultAmount, goals, wallets]);

  const goal = goals.find((g) => g.id === selectedGoalId);
  const wallet = wallets.find((w) => w.id === walletId);
  const num = parseFloat(amount) || 0;
  const insufficient =
    wallet && num > wallet.balance && wallet.type !== "credit";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!num || !selectedGoalId || !walletId) return;
    addGoalContribution(selectedGoalId, walletId, num, note || undefined);
    onSaved?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {fromAI ? (
              <Sparkles className="h-4 w-4 text-primary" />
            ) : (
              <PiggyBank className="h-4 w-4 text-violet-600" />
            )}
            {fromAI ? "Konfirmasi Setor ke Goal" : "Tambah Dana ke Goal"}
          </DialogTitle>
          <DialogDescription>
            Saldo akan ditarik dari dompet pilihan dan tercatat di history
            transaksi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Goal Tujuan</Label>
            <Combobox
              value={selectedGoalId}
              onValueChange={setSelectedGoalId}
              items={goals.map<ComboboxItem>((g) => {
                const pct = ((g.current_amount / g.target_amount) * 100).toFixed(0);
                return { value: g.id, label: g.goal_name, icon: "🎯", hint: `(${pct}%)` };
              })}
              placeholder="Pilih goal"
              searchPlaceholder="Cari goal..."
              emptyMessage="Belum ada goal."
              disabled={!!goalId && goals.some((g) => g.id === goalId)}
              triggerClassName="w-full"
            />
          </div>

          {goal && (
            <div className="bg-muted rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saat ini</span>
                <span className="font-medium">
                  {formatRupiah(goal.current_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target</span>
                <span className="font-medium">
                  {formatRupiah(goal.target_amount)}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="text-muted-foreground">Setelah setor</span>
                <span className="font-semibold text-primary">
                  {formatRupiah(goal.current_amount + num)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Jumlah (Rp)</Label>
            <CurrencyInput
              id="amount"
              value={amount}
              onValueChange={setAmount}
              placeholder="500.000"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Ambil dari Dompet</Label>
            <Combobox
              value={walletId}
              onValueChange={setWalletId}
              items={wallets.map<ComboboxItem>((w) => ({
                value: w.id,
                label: w.name,
                icon: w.icon,
                hint: formatRupiah(w.balance),
              }))}
              placeholder="Pilih dompet"
              searchPlaceholder="Cari dompet..."
              emptyMessage="Tidak ada dompet."
              triggerClassName="w-full"
            />
            {insufficient && (
              <p className="text-xs text-amber-600">
                ⚠ Saldo dompet tidak cukup, tapi masih bisa lanjut.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Catatan (opsional)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Misal: Sisa gaji bulan ini"
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
            <Button
              type="submit"
              disabled={!num || !selectedGoalId || !walletId}
            >
              {fromAI ? "Konfirmasi & Setor" : "Setor ke Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
