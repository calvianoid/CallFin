"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useSyncExternalStore } from "react";
import { Locale, TRANSLATIONS, TranslationKey } from "./translations";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Translate a key. Optional `vars` object replaces `{name}` placeholders. */
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "callfin.locale";

// localStorage never notifies same-tab changes; re-renders after setLocale()
// come from the override state below.
const emptySubscribe = () => () => {};

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Server snapshot: "id" (matches the SSR markup). Client snapshot: the
  // saved choice, falling back to the browser language.
  const detectedLocale = useSyncExternalStore<Locale>(
    emptySubscribe,
    () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === "id" || saved === "en") return saved;
        const nav = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "id";
        return nav.startsWith("en") ? "en" : "id";
      } catch {
        return "id";
      }
    },
    () => "id",
  );
  const ready = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [override, setOverride] = useState<Locale | null>(null);

  const locale = override ?? detectedLocale;

  const setLocale = useCallback((l: Locale) => {
    setOverride(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    } catch {
      // ignore
    }
  }, []);

  // Keep <html lang> in sync
  useEffect(() => {
    if (ready) document.documentElement.lang = locale;
  }, [locale, ready]);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const dict = TRANSLATIONS[locale] as Record<string, string>;
      let str = dict[key] ?? (TRANSLATIONS.id as Record<string, string>)[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return str;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, ready }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used inside LocaleProvider");
  return ctx;
}
