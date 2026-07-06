"use client";

/**
 * Revamp: command bar global (⌘K / Ctrl+K) bergaya spotlight.
 * Isinya `CommandSpotlight` — input di atas, hasil parse jadi kartu
 * konfirmasi langsung di bawahnya (lihat CommandSpotlight.tsx).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CommandSpotlight } from "@/components/chat/CommandSpotlight";
import { Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface CommandBarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const CommandBarContext = createContext<CommandBarContextValue | null>(null);

export function useCommandBar() {
  const ctx = useContext(CommandBarContext);
  if (!ctx) throw new Error("useCommandBar must be used within CommandBarProvider");
  return ctx;
}

export function CommandBarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);

  return (
    <CommandBarContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="p-0 gap-0 overflow-hidden sm:max-w-xl w-[calc(100vw-1.5rem)] top-[12%] translate-y-0 rounded-2xl"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">{t("commandbar.title")}</DialogTitle>
          <CommandSpotlight />
        </DialogContent>
      </Dialog>
    </CommandBarContext.Provider>
  );
}

/** Pill pemicu command bar — dipakai di header dashboard & halaman lain. */
export function CommandBarTrigger({ className }: { className?: string }) {
  const { setOpen } = useCommandBar();
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-left transition-colors hover:border-primary/50",
        className,
      )}
    >
      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
      <span className="flex-1 truncate text-sm text-muted-foreground">
        {t("commandbar.placeholder")}
      </span>
      <kbd className="hidden sm:inline-flex items-center rounded border border-border px-1.5 py-0.5 font-num text-[10px] text-muted-foreground">
        ⌘K
      </kbd>
    </button>
  );
}
