"use client";

import { useState } from "react";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, LayoutDashboard } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { t } = useTranslation();
  // Chat and Dashboard are each mounted exactly ONCE and shared between the
  // mobile (tabbed) and desktop (side-by-side) layouts via CSS. Mounting them
  // per-layout would fork chat history: a conversation started on mobile
  // would vanish when the viewport crosses the lg breakpoint, and a pending
  // confirm card would exist in one instance but not the other.
  const [tab, setTab] = useState("chat");

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Mobile / Tablet: tab switcher (panels below are shared) */}
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="lg:hidden shrink-0">
        <TabsList className="mx-3 mt-3 mb-3 grid grid-cols-2 w-auto">
          <TabsTrigger value="chat" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Chat
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" /> {t("page.dashboardTab")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div
          className={cn(
            "h-full min-h-0 flex-col bg-card border-t border-border lg:border-t-0 lg:border-r lg:flex lg:flex-none lg:w-[420px] lg:shrink-0",
            tab === "chat" ? "flex flex-1" : "hidden",
          )}
        >
          <ChatInterface />
        </div>
        <div
          className={cn(
            "h-full min-h-0 flex-1 overflow-y-auto bg-background lg:block",
            tab === "dashboard" ? "block" : "hidden",
          )}
        >
          <DashboardContent />
        </div>
      </div>
    </div>
  );
}
