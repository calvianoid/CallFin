"use client";

/** Segmented Daftar / Kategori control shared by /transactions and /categories. */

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

export function TxViewToggle({ active }: { active: "list" | "categories" }) {
  const { t } = useTranslation();
  const base = "px-3 py-1.5 rounded-md transition-colors";
  const on = "bg-background font-medium shadow-sm text-foreground";
  const off = "text-muted-foreground hover:text-foreground";
  return (
    <div className="inline-flex items-center rounded-lg bg-muted p-0.5 text-sm">
      <Link href="/transactions" className={cn(base, active === "list" ? on : off)}>
        {t("tx.viewList")}
      </Link>
      <Link href="/categories" className={cn(base, active === "categories" ? on : off)}>
        {t("tx.viewCategories")}
      </Link>
    </div>
  );
}
