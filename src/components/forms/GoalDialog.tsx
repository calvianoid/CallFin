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
import { Goal } from "@/types";
import { useStore } from "@/lib/store";

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Goal;
}

export function GoalDialog({ open, onOpenChange, initial }: GoalDialogProps) {
  const { addGoal, updateGoal } = useStore();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.goal_name || "");
  const [target, setTarget] = useState<string>(
    initial?.target_amount ? String(initial.target_amount) : "",
  );
  const [current, setCurrent] = useState<string>(
    initial?.current_amount ? String(initial.current_amount) : "0",
  );
  const [deadline, setDeadline] = useState(
    initial?.deadline?.slice(0, 10) || "",
  );

  useEffect(() => {
    if (open) {
      setName(initial?.goal_name || "");
      setTarget(initial?.target_amount ? String(initial.target_amount) : "");
      setCurrent(
        initial?.current_amount ? String(initial.current_amount) : "0",
      );
      setDeadline(initial?.deadline?.slice(0, 10) || "");
    }
  }, [open, initial]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetNum = parseFloat(target);
    const currentNum = parseFloat(current) || 0;
    if (!name || !targetNum || !deadline) return;

    const payload = {
      goal_name: name,
      target_amount: targetNum,
      current_amount: currentNum,
      deadline,
    };

    if (isEdit && initial) {
      updateGoal(initial.id, payload);
    } else {
      addGoal(payload);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Goal" : "Tambah Financial Goal"}
          </DialogTitle>
          <DialogDescription>
            Tetapkan target keuangan dan AI akan membantu memantau progress-nya.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Goal</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Dana darurat, Liburan ke Bali"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="target">Target (Rp)</Label>
              <CurrencyInput
                id="target"
                value={target}
                onValueChange={setTarget}
                placeholder="10.000.000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current">Saldo Awal (Rp)</Label>
              <CurrencyInput
                id="current"
                value={current}
                onValueChange={setCurrent}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Target Tanggal</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
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
              {isEdit ? "Simpan Perubahan" : "Tambah Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
