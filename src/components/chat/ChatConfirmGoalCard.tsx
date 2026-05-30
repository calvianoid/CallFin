"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Check, X, Edit3, PiggyBank } from "lucide-react";
import { Wallet, Goal } from "@/types";
import { ParsedGoalContribution } from "@/lib/chat-ai";
import { formatRupiah } from "@/lib/mock-data";
import { useTranslation } from "@/lib/i18n/context";

interface ChatConfirmGoalCardProps {
  parsed: ParsedGoalContribution;
  wallet?: Wallet;
  goal?: Goal;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function ChatConfirmGoalCard({ parsed, wallet, goal, onConfirm, onEdit, onCancel, disabled }: ChatConfirmGoalCardProps) {
  const { t } = useTranslation();
  const newAmount = goal ? goal.current_amount + parsed.amount : parsed.amount;
  const newPct = goal ? (newAmount / goal.target_amount) * 100 : 0;

  return (
    <div className="flex gap-3 px-4 py-3">
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarFallback className="bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-1 max-w-[85%] flex-1">
        <span className="text-xs font-medium text-muted-foreground">CallFin AI</span>

        <div className="bg-muted rounded-2xl rounded-tl-sm p-3 space-y-3 border border-violet-200">
          <p className="text-sm">{t("chat.card.caughtGoal")}</p>

          <div className="bg-background rounded-xl p-3 space-y-2 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("chat.card.type")}</span>
              <span className="flex items-center gap-1 text-xs font-medium bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                <PiggyBank className="h-3 w-3" /> {t("chat.card.goalKind")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("chat.card.goal")}</span>
              <span className="text-xs font-semibold">🎯 {parsed.goal_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("chat.card.amount")}</span>
              <span className="font-bold text-base">{formatRupiah(parsed.amount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("chat.card.fromWallet")}</span>
              <span className="text-xs font-medium">
                {wallet ? `${wallet.icon} ${wallet.name}` : "—"}
              </span>
            </div>
            {goal && (
              <div className="flex items-center justify-between border-t border-border pt-1.5 mt-1">
                <span className="text-xs text-muted-foreground">{t("chat.card.progressAfter")}</span>
                <span className="text-xs font-semibold text-primary">
                  {formatRupiah(newAmount)} ({newPct.toFixed(0)}%)
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={onConfirm} disabled={disabled} className="flex-1 gap-1">
              <Check className="h-3.5 w-3.5" /> {t("chat.card.confirm")}
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit} disabled={disabled} className="gap-1">
              <Edit3 className="h-3.5 w-3.5" /> {t("chat.card.edit")}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} disabled={disabled} className="gap-1 text-muted-foreground">
              <X className="h-3.5 w-3.5" /> {t("chat.card.cancel")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
