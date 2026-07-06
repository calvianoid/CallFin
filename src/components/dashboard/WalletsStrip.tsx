"use client";

import { useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { formatRupiah, WALLET_TYPE_LABEL } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Wallet as WalletIcon, Landmark, Banknote, Smartphone, CreditCard } from "lucide-react";
import type { Wallet } from "@/types";

/** Click-and-drag panning + vertical-wheel-to-horizontal, so the strip pans
 * on desktop mouse the same way it swipes on touch. No-ops when the row
 * doesn't overflow (i.e. the desktop grid), so it's safe to always attach. */
function useDragToScroll<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  function onPointerDown(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    drag.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 3) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
  }
  function endDrag(e: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
    drag.current.active = false;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  }
  function onWheel(e: React.WheelEvent) {
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }
  function onClickCapture(e: React.MouseEvent) {
    if (drag.current.moved) e.preventDefault();
  }

  return { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onWheel, onClickCapture };
}

const WALLET_ICON: Record<Wallet["type"], typeof WalletIcon> = {
  bank: Landmark,
  cash: Banknote,
  ewallet: Smartphone,
  credit: CreditCard,
};

/** Small-caps sub-label under the wallet name: masked account number, an
 *  explicit subtitle, or the wallet-type label as a fallback. */
function walletSubLabel(w: Wallet): string {
  if (w.account_number) return `•••• ${w.account_number}`;
  if (w.subtitle) return w.subtitle;
  return WALLET_TYPE_LABEL[w.type] ?? "";
}

export function WalletsStrip() {
  const { wallets, isHydrating } = useStore();
  const stripRef = useRef<HTMLDivElement>(null);
  const dragProps = useDragToScroll(stripRef);

  if (isHydrating && wallets.length === 0) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="min-w-[150px] h-[104px] rounded-2xl shrink-0" />
        ))}
      </div>
    );
  }

  // The first bank account reads as the "primary" wallet (matches the design's
  // highlighted card); fall back to the first wallet of any type.
  const primaryId = wallets.find((w) => w.type === "bank")?.id ?? wallets[0]?.id;

  return (
    <div
      ref={stripRef}
      {...dragProps}
      className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-proximity scroll-pl-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:scroll-pl-0 cursor-grab active:cursor-grabbing select-none lg:grid lg:grid-cols-5 lg:overflow-visible lg:cursor-default"
    >
      {wallets.map((w) => {
        const primary = w.id === primaryId;
        const Icon = WALLET_ICON[w.type] ?? WalletIcon;
        return (
          <Link
            key={w.id}
            href="/wallets"
            className={cn(
              "group min-w-[168px] lg:min-w-0 shrink-0 snap-start rounded-2xl p-4 flex flex-col justify-between min-h-[104px] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0",
              primary
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-card border border-border hover:border-border/80",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className={cn("text-sm font-medium truncate", primary ? "text-primary-foreground" : "text-foreground")}>
                {w.name}
              </p>
              <Icon className={cn("h-4 w-4 shrink-0", primary ? "text-primary-foreground/80" : "text-muted-foreground")} />
            </div>
            <div className="space-y-1">
              <p
                className={cn(
                  "text-[10px] font-medium uppercase tracking-[0.12em] font-num",
                  primary ? "text-primary-foreground/70" : "text-muted-foreground",
                )}
              >
                {walletSubLabel(w)}
              </p>
              <p
                className={cn(
                  "text-lg font-semibold font-num tracking-tight",
                  primary
                    ? "text-primary-foreground"
                    : w.balance < 0
                      ? "text-destructive"
                      : "text-foreground",
                )}
              >
                {formatRupiah(w.balance)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
