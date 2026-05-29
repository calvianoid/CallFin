"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  MessageSquare,
  List,
  PieChart,
  Target,
  FileText,
  Settings,
  LogOut,
  Tag,
  Wallet as WalletIcon,
  Upload,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/translations";
import { useStore } from "@/lib/store";

const navItems: { href: string; icon: typeof MessageSquare; key: TranslationKey; label?: string }[] = [
  { href: "/", icon: MessageSquare, key: "nav.dashboard" },
  { href: "/wallets", icon: WalletIcon, key: "nav.wallets" },
  { href: "/transactions", icon: List, key: "nav.transactions" },
  { href: "/budgets", icon: PieChart, key: "nav.budgets" },
  { href: "/goals", icon: Target, key: "nav.goals" },
  { href: "/categories", icon: Tag, key: "nav.categories" },
  { href: "/reports", icon: FileText, key: "nav.reports" },
  { href: "/import", icon: Upload, key: "nav.dashboard", label: "Import" },
];

interface SidebarProps {
  onNavigate?: () => void;
  className?: string;
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { profile } = useStore();
  const displayName = profile?.full_name || "Guest";
  const displayEmail = profile?.email || "—";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-6">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <TrendingUp className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg text-sidebar-foreground">CallFin</span>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ href, icon: Icon, key, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
              {label ?? t(key)}
            </Link>
          );
        })}
      </nav>

      <Separator className="my-3 bg-sidebar-border" />

      <div className="space-y-1">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors",
            pathname === "/settings"
              ? "bg-primary/10 text-primary font-medium"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          {t("nav.settings")}
        </Link>
        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-colors"
          onClick={async () => {
            try {
              const { signOut } = await import("@/lib/api/auth");
              await signOut();
            } catch {
              // Supabase not configured — just navigate to login
              window.location.href = "/login";
            }
          }}
        >
          <LogOut className="h-4 w-4" />
          {t("nav.logout")}
        </button>

        <div className="flex items-center gap-3 px-3 py-2 mt-1">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{initials || "?"}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-sidebar-foreground truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground truncate">{displayEmail}</span>
          </div>
        </div>
      </div>
    </>
  );
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <aside className={cn("flex flex-col w-60 min-h-screen bg-sidebar border-r border-sidebar-border py-4 px-3 shrink-0", className)}>
      <SidebarContent />
    </aside>
  );
}
