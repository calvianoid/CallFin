"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Check, X, Edit3, ArrowLeftRight, ArrowRight } from "lucide-react";
import { Wallet } from "@/types";
import { ParsedTransfer } from "@/lib/chat-ai";
import { formatRupiah } from "@/lib/mock-data";
import { useTranslation } from "@/lib/i18n/context";

interface ChatConfirmTransferCardProps {
  parsed: ParsedTransfer;
  fromWallet?: Wallet;
  toWallet?: Wallet;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function ChatConfirmTransferCard({
  parsed, fromWallet, toWallet, onConfirm, onEdit, onCancel, disabled,
}: ChatConfirmTransferCardProps) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-3 px-4 py-3">
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarFallback className="bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-1 max-w-[85%] flex-1">
        <span className="text-xs font-medium text-muted-foreground">CallFin AI</span>

        <div className="bg-muted rounded-2xl rounded-tl-sm p-3 space-y-3 border border-sky-200">
          <p className="text-sm">{t("chat.card.caughtTransfer")}</p>

          <div className="bg-background rounded-xl p-3 space-y-2 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("chat.card.type")}</span>
              <span className="flex items-center gap-1 text-xs font-medium bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                <ArrowLeftRight className="h-3 w-3" /> {t("chat.card.transferKind")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("chat.card.amount")}</span>
              <span className="font-bold text-base tabular-nums">{formatRupiah(parsed.amount)}</span>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <div className="flex-1 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("chat.card.from")}</p>
                <p className="text-sm font-medium mt-0.5">{fromWallet ? `${fromWallet.icon} ${fromWallet.name}` : parsed.from_name}</p>
                {fromWallet && (
                  <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                    {formatRupiah(fromWallet.balance)} → {formatRupiah(fromWallet.balance - parsed.amount)}
                  </p>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-sky-500 shrink-0" />
              <div className="flex-1 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("chat.card.to")}</p>
                <p className="text-sm font-medium mt-0.5">{toWallet ? `${toWallet.icon} ${toWallet.name}` : parsed.to_name}</p>
                {toWallet && (
                  <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                    {formatRupiah(toWallet.balance)} → {formatRupiah(toWallet.balance + parsed.amount)}
                  </p>
                )}
              </div>
            </div>
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
