"use client";

/**
 * Revamp: halaman Insight bertab sesuai desain Paper —
 * Ringkasan · Kategori · Dompet · Kebebasan (FIRE). Ringkasan/Kategori/Dompet
 * dilayani satu instance ReportsPage (mode `embedded` + `view`) sehingga bulan
 * yang dipilih & perhitungan tetap sinkron; Kebebasan memakai FreedomPage.
 * Tab Kebebasan mengikuti preferensi "Tampilkan Kebebasan Finansial".
 */

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReportsPage from "@/app/(app)/reports/page";
import FreedomPage from "@/app/(app)/freedom/page";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/month-picker";
import { Download } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { usePreferences } from "@/lib/preferences";
import { getYearMonth } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Tab = "ringkasan" | "kategori" | "dompet" | "kebebasan";

function InsightInner() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { showFreedom } = usePreferences();
  const [tab, setTab] = useState<Tab>(() =>
    searchParams.get("tab") === "kebebasan" ? "kebebasan" : "ringkasan",
  );
  const [month, setMonth] = useState(() => getYearMonth());

  // Preferensi bisa berubah kapan saja — turunkan tab aktif alih-alih setState.
  const activeTab: Tab = !showFreedom && tab === "kebebasan" ? "ringkasan" : tab;
  const reportView =
    activeTab === "kategori" ? "kategori" : activeTab === "dompet" ? "dompet" : "ringkasan";
  const subtitle =
    activeTab === "kategori"
      ? t("insight.subCategory")
      : activeTab === "dompet"
        ? t("insight.subWallet")
        : activeTab === "kebebasan"
          ? t("fire.subtitle")
          : t("insight.subtitle");

  return (
    <div className="p-4 sm:p-6 max-w-6xl space-y-5">
      {/* Header: judul + tab + bulan + export */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{t("insight.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeTab !== "kebebasan" && (
            <>
              <MonthPicker value={month} onChange={setMonth} />
              <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => window.print()}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{t("reports.export")}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className={cn("grid w-full sm:w-fit", showFreedom ? "grid-cols-4" : "grid-cols-3")}>
          <TabsTrigger value="ringkasan" className="px-3 sm:px-4">{t("insight.tabSummary")}</TabsTrigger>
          <TabsTrigger value="kategori" className="px-3 sm:px-4">{t("insight.tabCategory")}</TabsTrigger>
          <TabsTrigger value="dompet" className="px-3 sm:px-4">{t("insight.tabWallet")}</TabsTrigger>
          {showFreedom && (
            <TabsTrigger value="kebebasan" className="px-3 sm:px-4">{t("insight.tabFreedom")}</TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {activeTab === "kebebasan" ? (
        <FreedomPage embedded />
      ) : (
        <ReportsPage embedded view={reportView} month={month} onMonthChange={setMonth} />
      )}
    </div>
  );
}

export default function InsightPage() {
  return (
    <Suspense>
      <InsightInner />
    </Suspense>
  );
}
