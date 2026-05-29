"use client";

import { ImportWizard } from "@/components/import/ImportWizard";

export default function ImportPage() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl space-y-5">
      <div>
        <h1 className="text-lg sm:text-xl font-bold">Import Transaksi</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Pindahin data lama dari aplikasi finance lain ke CallFin.
        </p>
      </div>

      <ImportWizard />
    </div>
  );
}
