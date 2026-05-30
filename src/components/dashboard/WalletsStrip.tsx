"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { formatRupiah } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export function WalletsStrip() {
  const { wallets, isHydrating } = useStore();
  const { t } = useTranslation();
  const total = wallets.reduce((s, w) => s + w.balance, 0);

  if (isHydrating && wallets.length === 0) {
    return (
      <Card className="border-border/50 overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-border/50">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex gap-2 p-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="min-w-[140px] h-[68px] rounded-xl shrink-0" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/50">
        <div>
          <p className="text-xs text-muted-foreground">{t("dashboard.totalBalance")}</p>
          <p className="text-lg font-bold tabular-nums tracking-tight">{formatRupiah(total)}</p>
        </div>
        <Link href="/wallets" className="text-xs text-primary font-medium hover:underline">
          {t("dashboard.manageWallets")}
        </Link>
      </div>
      <div className="flex gap-2 p-3 overflow-x-auto">
        {wallets.map((w) => (
          <div
            key={w.id}
            className="min-w-[140px] rounded-xl p-3 text-white shrink-0 relative overflow-hidden"
          >
            <div className={cn("absolute inset-0", w.color)} />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/10" />
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-lg">{w.icon}</span>
              </div>
              <p className="text-[10px] uppercase tracking-wide opacity-80">{w.name}</p>
              <p className="text-sm font-bold mt-0.5 tabular-nums tracking-tight">{formatRupiah(w.balance)}</p>
            </div>
          </div>
        ))}
        <Link
          href="/wallets"
          className="min-w-[80px] rounded-xl p-3 border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0"
        >
          <Plus className="h-4 w-4 mb-1" />
          <span className="text-[10px]">{t("common.add")}</span>
        </Link>
      </div>
    </Card>
  );
}
