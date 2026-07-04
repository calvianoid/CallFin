"use client";

import { createContext, useContext, useState, useCallback, useSyncExternalStore, ReactNode } from "react";

/**
 * Lightweight user-preferences store (localStorage-backed) for UI feature
 * toggles that don't belong in the database — e.g. whether to surface the
 * Financial Freedom menu. Mirrors the LocaleProvider pattern.
 */
interface PreferencesContextValue {
  /** Show the Financial Freedom menu item in the sidebar. Off by default — opt-in via Settings. */
  showFreedom: boolean;
  setShowFreedom: (v: boolean) => void;
  /** True once running on the client (avoids hydration flash). */
  ready: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const KEY_FREEDOM = "callfin.showFreedom";

// localStorage never notifies same-tab changes; re-renders after
// setShowFreedom() come from the override state below.
const emptySubscribe = () => () => {};

export function PreferencesProvider({ children }: { children: ReactNode }) {
  // Server snapshot: default hidden. Client snapshot: whatever was saved.
  const stored = useSyncExternalStore(
    emptySubscribe,
    () => {
      try {
        return localStorage.getItem(KEY_FREEDOM);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const ready = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [override, setOverride] = useState<boolean | null>(null);

  const showFreedom = override ?? stored === "1";

  const setShowFreedom = useCallback((v: boolean) => {
    setOverride(v);
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
