"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Transaction } from "@/types";
import { formatRupiah } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const { isHydrating, wallets } = useStore();
  const { t } = useTranslation();
  const walletName = (id?: string) => wallets.find((w) => w.id === id)?.name;
  const recent = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7);

  if (isHydrating && transactions.length === 0) {
    return (
      <Card className="border-border/50 p-0">
        <div className="px-4 py-3 border-b border-border/50">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="divide-y divide-border/50">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 p-0 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/50">
        <p className="text-sm font-semibold">{t("dashboard.recentTransactions")}</p>
        <Link href="/transactions" className="text-xs text-primary font-medium hover:underline">
          {t("dashboard.viewAll")}
        </Link>
      </div>
      <div className="divide-y divide-border/50">
        {recent.map((tx) => {
          const isIncome = tx.type === "income";
          const isTransfer = tx.type === "transfer";
          const Icon = isTransfer ? ArrowLeftRight : isIncome ? ArrowDownLeft : ArrowUpRight;
          const subtitle = [tx.category, walletName(tx.wallet_id)].filter(Boolean).join(" · ");
          return (
            <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
              <div
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-full shrink-0",
                  isIncome ? "bg-positive/10" : isTransfer ? "bg-primary/10" : "bg-muted",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isIncome ? "text-positive" : isTransfer ? "text-primary" : "text-muted-foreground",
                  )}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium truncate", !tx.description?.trim() && "italic text-muted-foreground/70")}>
                  {tx.description?.trim() || t("tx.noDescription")}
                </p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</p>
              </div>

              <p
                className={cn(
                  "text-sm font-semibold shrink-0 font-num tracking-tight",
                  isIncome ? "text-positive" : "text-foreground",
                )}
              >
                {isIncome ? "+" : "-"}
                {formatRupiah(tx.amount).replace(/^Rp\s?/, "")}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
