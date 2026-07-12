"use client";

import { useState, useCallback, useEffect, type RefObject } from "react";

export interface ScrollProgress {
  /** Thumb width as a % of the track (min 12%). */
  thumbPct: number;
  /** Thumb offset from the left as a % of the track. */
  leftPct: number;
  /** False when the element doesn't overflow (nothing to scroll). */
  visible: boolean;
}

/**
 * Tracks horizontal scroll position of an element so a custom scroll indicator
 * can be rendered (the native scrollbar is hidden via `.no-scrollbar`).
 * Pass a changing `revision` (e.g. item count) to re-measure when content changes.
 */
export function useScrollProgress<T extends HTMLElement>(
  ref: RefObject<T | null>,
  revision: number = 0,
): ScrollProgress {
  const [bar, setBar] = useState<ScrollProgress>({ thumbPct: 100, leftPct: 0, visible: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    if (scrollWidth <= clientWidth + 1) {
      setBar((b) => (b.visible ? { ...b, visible: false } : b));
      return;
    }
    const thumbPct = Math.max((clientWidth / scrollWidth) * 100, 12);
    const maxScroll = scrollWidth - clientWidth;
    const leftPct = maxScroll > 0 ? (scrollLeft / maxScroll) * (100 - thumbPct) : 0;
    setBar({ thumbPct, leftPct, visible: true });
  }, [ref]);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update, ref, revision]);

  return bar;
}
