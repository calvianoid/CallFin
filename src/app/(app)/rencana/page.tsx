"use client";

/**
 * Revamp: halaman Rencana = Budget + Goals berdampingan dalam satu layout
 * 2 kolom (sesuai desain Paper). Konten memakai BudgetsPage & GoalsPage
 * existing lewat mode `embedded` (fitur 1:1). Route lama /budgets & /goals
 * tetap berfungsi standalone.
 */

import BudgetsPage from "@/app/(app)/budgets/page";
import GoalsPage from "@/app/(app)/goals/page";
import { useStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/context";
import { getYearMonth } from "@/lib/utils";
import { formatMonthLabel } from "@/components/ui/month-picker";

export default function RencanaPage() {
  const { goals } = useStore();
  const { t } = useTranslation();
  const month = getYearMonth();

  return (
    <div className="p-4 sm:p-6 max-w-6xl space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{t("nav.plan")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("plan.subtitle", { month: formatMonthLabel(month), n: goals.length })}
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 sm:gap-6 items-start">
        <BudgetsPage embedded />
        <GoalsPage embedded />
      </div>
    </div>
  );
}
