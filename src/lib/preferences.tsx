"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

/**
 * Lightweight user-preferences store (localStorage-backed) for UI feature
 * toggles that don't belong in the database — e.g. whether to surface the
 * Financial Freedom menu. Mirrors the LocaleProvider pattern.
 */
interface PreferencesContextValue {
  /** Show the Financial Freedom menu item in the sidebar. */
  showFreedom: boolean;
  setShowFreedom: (v: boolean) => void;
  /** True once localStorage has been read (avoids hydration flash). */
  ready: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const KEY_FREEDOM = "callfin.showFreedom";

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [showFreedom, setShowFreedomState] = useState(true); // default: shown
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY_FREEDOM);
      if (saved === "0" || saved === "1") setShowFreedomState(saved === "1");
    } catch {
      // ignore
    } finally {
      setReady(true);
    }
  }, []);

  const setShowFreedom = useCallback((v: boolean) => {
    setShowFreedomState(v);
    try {
      localStorage.setItem(KEY_FREEDOM, v ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  return (
    <PreferencesContext.Provider value={{ showFreedom, setShowFreedom, ready }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside PreferencesProvider");
  return ctx;
}
