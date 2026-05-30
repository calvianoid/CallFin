"use client";

import { ImportWizard } from "@/components/import/ImportWizard";
import { useTranslation } from "@/lib/i18n/context";

export default function ImportPage() {
  const { t } = useTranslation();
  return (
    <div className="p-4 sm:p-6 max-w-3xl space-y-5">
      <div>
        <h1 className="text-lg sm:text-xl font-bold">{t("import.title")}</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {t("import.subtitle")}
        </p>
      </div>

      <ImportWizard />
    </div>
  );
}
