"use client";

/**
 * Revamp: dashboard full-width. Chat AI tidak lagi jadi panel samping —
 * dipanggil lewat command bar (⌘K), tombol pill di header, atau FAB di
 * bottom nav mobile. ChatInterface di-mount sekali di CommandBarProvider
 * sehingga history tetap utuh lintas halaman.
 */

import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { CommandBarTrigger } from "@/components/chat/CommandBar";
import { useStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";
import { format } from "date-fns";
import { id as idLocale, enUS } from "date-fns/locale";

export default function DashboardPage() {
  const { profile } = useStore();
  const { t, locale } = useTranslation();

  const hour = new Date().getHours();
  const greetKey =
    hour < 11
      ? "dashboard.greetingMorning"
      : hour < 15
        ? "dashboard.greetingAfternoon"
        : hour < 19
          ? "dashboard.greetingEvening"
          : "dashboard.greetingNight";
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];
  const dateStr = format(new Date(), "EEEE, d MMMM yyyy", {
    locale: locale === "en" ? enUS : idLocale,
  });

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-5 lg:px-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">
            {t(greetKey)}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{dateStr}</p>
        </div>
        <CommandBarTrigger className="hidden lg:block w-full max-w-md" />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <DashboardContent />
      </div>
    </div>
  );
}
