"use client";

import { ChatInterface } from "@/components/chat/ChatInterface";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, LayoutDashboard } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export default function DashboardPage() {
  const { t } = useTranslation();
  return (
    <>
      {/* Mobile / Tablet: Tabs */}
      <div className="lg:hidden h-full flex flex-col min-h-0">
        <Tabs defaultValue="chat" className="flex flex-col h-full min-h-0">
          <TabsList className="mx-3 mt-3 grid grid-cols-2 shrink-0">
            <TabsTrigger value="chat" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Chat
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-1.5">
              <LayoutDashboard className="h-3.5 w-3.5" /> {t("page.dashboardTab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 min-h-0 overflow-hidden mt-0 data-[state=active]:flex flex-col bg-card border-t border-border">
            <ChatInterface />
          </TabsContent>

          <TabsContent value="dashboard" className="flex-1 min-h-0 overflow-y-auto mt-0 data-[state=active]:block bg-background">
            <DashboardContent />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: Side-by-side */}
      <div className="hidden lg:flex h-full overflow-hidden">
        <div className="flex flex-col w-[420px] h-full shrink-0 border-r border-border bg-card min-h-0">
          <ChatInterface />
        </div>
        <ScrollArea className="flex-1 bg-background h-full">
          <DashboardContent />
        </ScrollArea>
      </div>
    </>
  );
}
