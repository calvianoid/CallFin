"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { formatRupiah } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

/** Click-and-drag panning + vertical-wheel-to-horizontal, so the strip pans
 * on desktop mouse the same way it swipes on touch (native overflow-x-auto
 * otherwise requires Shift+wheel or a trackpad, which reads as "stuck"). */
function useDragToScroll<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  function onPointerDown(e: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
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
    el.releasePointerCapture(e.pointerId);
  }

  function onWheel(e: React.WheelEvent) {
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    // Only hijack when the scroll is more vertical than horizontal, so
    // trackpad horizontal swipes still pass through untouched.
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }

  // Suppress the click that follows a drag (e.g. on the wallet cards' Link).
  function onClickCapture(e: React.MouseEvent) {
    if (drag.current.moved) e.preventDefault();
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onWheel,
    onClickCapture,
  };
}

export function WalletsStrip() {
  const { wallets, isHydrating } = useStore();
  const { t } = useTranslation();
  const total = wallets.reduce((s, w) => s + w.balance, 0);
  const stripRef = useRef<HTMLDivElement>(null);
  const dragProps = useDragToScroll(stripRef);
  // Native scrollbar is hidden (see no-scrollbar), so this thin bar is the
  // only visual cue that the strip scrolls and how far there is to go.
  const [scrollBar, setScrollBar] = useState({ thumbPct: 100, leftPct: 0, visible: false });

  const updateScrollBar = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    if (scrollWidth <= clientWidth + 1) {
      setScrollBar({ thumbPct: 100, leftPct: 0, visible: false });
      return;
    }
    const thumbPct = Math.max((clientWidth / scrollWidth) * 100, 12);
    const maxScroll = scrollWidth - clientWidth;
    const leftPct = maxScroll > 0 ? (scrollLeft / maxScroll) * (100 - thumbPct) : 0;
    setScrollBar({ thumbPct, leftPct, visible: true });
  }, []);

  useEffect(() => {
    updateScrollBar();
    const el = stripRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollBar, { passive: true });
    window.addEventListener("resize", updateScrollBar);
    return () => {
      el.removeEventListener("scroll", updateScrollBar);
      window.removeEventListener("resize", updateScrollBar);
    };
  }, [updateScrollBar, wallets.length]);

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
      <div
        ref={stripRef}
        {...dragProps}
        className="flex gap-2.5 p-3 pl-4 overflow-x-auto no-scrollbar snap-x snap-proximity scroll-pl-4 cursor-grab active:cursor-grabbing select-none"
      >
        {wallets.map((w) => (
          <div
            key={w.id}
            className="min-w-[144px] rounded-2xl p-3.5 text-white shrink-0 relative overflow-hidden snap-start shadow-md shadow-black/10 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]"
          >
            <div className={cn("absolute inset-0", w.color)} />
            <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/25" />
            <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-white/15 blur-xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2.5">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm text-base">
                  {w.icon}
                </span>
                {w.balance < 0 && (
                  <span className="text-[9px] font-semibold uppercase tracking-wide bg-black/25 rounded-full px-1.5 py-0.5">
                    {t("wallets.negative")}
                  </span>
                )}
              </div>
              <p className="text-[10px] uppercase tracking-wide opacity-80 truncate">{w.name}</p>
              <p className="text-sm font-bold mt-0.5 tabular-nums tracking-tight">{formatRupiah(w.balance)}</p>
            </div>
          </div>
        ))}
        <Link
          href="/wallets"
          className="min-w-[84px] rounded-2xl p-3 border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 shrink-0 snap-start"
        >
          <Plus className="h-4 w-4 mb-1" />
          <span className="text-[10px]">{t("common.add")}</span>
        </Link>
      </div>
      {scrollBar.visible && (
        <div className="px-3 pb-3 -mt-1">
          <div className="h-1 rounded-full bg-border/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/60 transition-[margin-left,width] duration-100"
              style={{ width: `${scrollBar.thumbPct}%`, marginLeft: `${scrollBar.leftPct}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
