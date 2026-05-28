"use client";

import { useState, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "callfin.demoBannerDismissed";

/**
 * Banner that appears when the app is running in "demo mode" — i.e. Supabase
 * env vars are missing. Avoids the awful surprise of a deployed instance
 * silently signing every visitor in as "Guest" with mock data.
 */
export function DemoModeBanner() {
  const isDemoMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const [dismissed, setDismissed] = useState(true); // hide until we know

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isDemoMode) {
      setDismissed(true);
      return;
    }
    // Allow re-show after page reload by reading from session, not local, storage
    setDismissed(sessionStorage.getItem(DISMISSED_KEY) === "1");
  }, [isDemoMode]);

  if (!isDemoMode || dismissed) return null;

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  return (
    <div
      className={cn(
        "relative w-full flex items-start gap-2 px-3 sm:px-4 py-2",
        "bg-amber-100 text-amber-900 border-b border-amber-200",
        "dark:bg-amber-950 dark:text-amber-100 dark:border-amber-900"
      )}
    >
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1 text-xs sm:text-sm leading-snug">
        <strong>Demo Mode</strong> — Aplikasi ini berjalan tanpa backend
        Supabase, jadi data yang kamu lihat & ubah cuma simulasi lokal yang gak
        tersimpan setelah refresh. Login & register juga di-bypass.
        {" "}
        <span className="opacity-75">
          Untuk pakai data asli: deploy dengan env vars{" "}
          <code className="font-mono text-[10px] sm:text-xs bg-amber-200/60 dark:bg-amber-900/60 px-1 py-0.5 rounded">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          dan{" "}
          <code className="font-mono text-[10px] sm:text-xs bg-amber-200/60 dark:bg-amber-900/60 px-1 py-0.5 rounded">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>
          .
        </span>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 -mr-1 p-1 rounded hover:bg-amber-200/50 dark:hover:bg-amber-900/50 transition-colors"
        aria-label="Tutup"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
