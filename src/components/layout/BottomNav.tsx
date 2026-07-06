"use client";

/**
 * Revamp: bottom navigation untuk mobile — 5 slot dengan tombol chat AI
 * (command bar) di tengah, sesuai desain "chat-first" di layar kecil.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, Target, BarChart3, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/translations";
import { useCommandBar } from "@/components/chat/CommandBar";

const items: { href: string; icon: typeof Home; key: TranslationKey; match: string[] }[] = [
  { href: "/", icon: Home, key: "nav.home", match: ["/"] },
  { href: "/transactions", icon: List, key: "nav.transactions", match: ["/transactions", "/categories", "/import"] },
  { href: "/rencana", icon: Target, key: "nav.plan", match: ["/rencana", "/budgets", "/goals"] },
  { href: "/insight", icon: BarChart3, key: "nav.insight", match: ["/insight", "/reports", "/freedom"] },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { setOpen } = useCommandBar();

  const isActive = (match: string[]) =>
    match.some((m) => (m === "/" ? pathname === "/" : pathname === m || pathname.startsWith(m + "/")));

  const renderItem = ({ href, icon: Icon, key, match }: (typeof items)[number]) => {
    const active = isActive(match);
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "flex w-14 flex-col items-center gap-0.5 py-1 text-[10px]",
          active ? "font-medium text-primary" : "text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
        {t(key)}
      </Link>
    );
  };

  return (
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-border bg-card/95 px-6 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur"
      aria-label={t("nav.menu")}
    >
      {items.slice(0, 2).map(renderItem)}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-mt-7 flex h-13 w-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
        aria-label={t("commandbar.title")}
        style={{ width: 52, height: 52 }}
      >
        <Sparkles className="h-6 w-6" />
      </button>
      {items.slice(2).map(renderItem)}
    </nav>
  );
}
