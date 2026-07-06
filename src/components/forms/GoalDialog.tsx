"use client";

import { useState } from "react";
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
import { useTranslation } from "@/lib/i18n/context";

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Goal;
  /** Prefill when creating a new goal (ignored in edit mode). */
  defaultName?: string;
  defaultTarget?: number;
}

export function GoalDialog({ open, onOpenChange, initial, defaultName, defaultTarget }: GoalDialogProps) {
  // The form only mounts while the dialog is open, so its useState
  // initializers re-run on every open — no reset effect needed.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <GoalForm
          onOpenChange={onOpenChange}
          initial={initial}
          defaultName={defaultName}
          defaultTarget={defaultTarget}
        />
      )}
    </Dialog>
  );
}

function GoalForm({ onOpenChange, initial, defaultName, defaultTarget }: Omit<GoalDialogProps, "open">) {
  const { addGoal, updateGoal } = useStore();
  const { t } = useTranslation();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.goal_name || defaultName || "");
  const [target, setTarget] = useState<string>(
    initial?.target_amount ? String(initial.target_amount) : defaultTarget ? String(defaultTarget) : "",
  );
  const [current, setCurrent] = useState<string>(
    initial?.current_amount ? String(initial.current_amount) : "0",
  );
  const [deadline, setDeadline] = useState(
    initial?.deadline?.slice(0, 10) || "",
  );

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
    <DialogContent className="top-auto bottom-0 left-0 translate-x-0 translate-y-0 max-w-full w-full rounded-b-none rounded-t-2xl sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:w-auto sm:rounded-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("goalDlg.title.edit") : t("goalDlg.title.add")}
          </DialogTitle>
          <DialogDescription>{t("goalDlg.desc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("goalDlg.name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("goalDlg.namePlaceholder")}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="target">{t("goalDlg.target")}</Label>
              <CurrencyInput
                id="target"
                value={target}
                onValueChange={setTarget}
                placeholder="10.000.000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current">{t("goalDlg.initial")}</Label>
              <CurrencyInput
                id="current"
                value={current}
                onValueChange={setCurrent}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">{t("goalDlg.deadline")}</Label>
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
              {t("common.cancel")}
            </Button>
            <Button type="submit">
              {isEdit ? t("common.saveChanges") : t("goalDlg.title.add")}
            </Button>
          </DialogFooter>
        </form>
    </DialogContent>
  );
}
