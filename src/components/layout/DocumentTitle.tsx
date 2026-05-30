"use client";

import { useEffect } from "react";
import { useTranslation } from "@/lib/i18n/context";

/**
 * Keeps the browser tab title and meta description in sync with the active
 * language. The static `metadata` export in layout.tsx provides the SSR /
 * pre-hydration default (English); this swaps it to the user's chosen locale
 * once the client knows it.
 */
export function DocumentTitle() {
  const { t, locale } = useTranslation();

  useEffect(() => {
    document.title = t("meta.title");
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t("meta.description"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  return null;
}
