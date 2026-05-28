"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarContent } from "./Sidebar";
import { Menu, TrendingUp } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <header className="lg:hidden flex items-center justify-between px-3 h-14 border-b border-border bg-card sticky top-0 z-30">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-muted transition-colors"
        aria-label={t("nav.menu")}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary">
          <TrendingUp className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="font-bold text-base">CallFin</span>
      </div>

      <div className="w-9" />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-3 bg-sidebar flex flex-col">
          <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
