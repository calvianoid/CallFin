"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Check, X, Edit3 } from "lucide-react";
import { ParsedTransaction, Wallet } from "@/types";
import { formatRupiah, CATEGORY_COLORS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface ChatConfirmCardProps {
  parsed: ParsedTransaction;
  wallet?: Wallet;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function ChatConfirmCard({ parsed, wallet, onConfirm, onEdit, onCancel, disabled }: ChatConfirmCardProps) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarFallback className="bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-1 max-w-[85%] flex-1">
        <span className="text-xs font-medium text-muted-foreground">CallFin AI</span>

        <div className="bg-muted rounded-2xl rounded-tl-sm p-3 space-y-3 border border-primary/20">
          <p className="text-sm">Saya menangkap transaksi ini. Apakah benar?</p>

          <div className="bg-background rounded-xl p-3 space-y-2 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Jenis</span>
              <Badge
                variant="secondary"
                className={cn("text-xs", parsed.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}
              >
                {parsed.type === "income" ? "📈 Pemasukan" : "📉 Pengeluaran"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Jumlah</span>
              <span className="font-bold text-base">{formatRupiah(parsed.amount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Kategori</span>
              <Badge variant="secondary" className={cn("text-xs", CATEGORY_COLORS[parsed.category] || CATEGORY_COLORS["Lainnya"])}>
                {parsed.category}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Dompet</span>
              <span className="text-xs font-medium">
                {wallet ? `${wallet.icon} ${wallet.name}` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Deskripsi</span>
              <span className="text-xs text-right max-w-[60%] truncate">{parsed.description}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={onConfirm} disabled={disabled} className="flex-1 gap-1">
              <Check className="h-3.5 w-3.5" /> Konfirmasi
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit} disabled={disabled} className="gap-1">
              <Edit3 className="h-3.5 w-3.5" /> Ubah
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} disabled={disabled} className="gap-1 text-muted-foreground">
              <X className="h-3.5 w-3.5" /> Batal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
