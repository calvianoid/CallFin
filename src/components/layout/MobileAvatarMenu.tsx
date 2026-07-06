"use client";

/**
 * Revamp: mobile access to full nav (Dompet, Pengaturan, logout) lives behind
 * an avatar button — replacing the old "CallFin" top bar. Matches the design's
 * mobile Beranda where the avatar sits in the greeting row. Opens the shared
 * sidebar drawer (SidebarContent) as a right-side sheet.
 */

import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarContent } from "./Sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "@/lib/i18n/context";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function MobileAvatarMenu({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const { profile } = useStore();
  const initials = (profile?.full_name || "?")
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("lg:hidden shrink-0 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring", className)}
        aria-label={t("nav.menu")}
      >
        <Avatar className="h-9 w-9">
          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
          <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">{initials}</AvatarFallback>
        </Avatar>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-64 p-3 bg-sidebar flex flex-col">
          <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
