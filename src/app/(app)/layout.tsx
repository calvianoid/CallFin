import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { CommandBarProvider } from "@/components/chat/CommandBar";
import { StoreProvider } from "@/lib/store";
import { WelcomeOnboarding } from "@/components/onboarding/WelcomeOnboarding";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <CommandBarProvider>
        <div className="flex h-screen bg-background overflow-hidden">
          <Sidebar className="hidden lg:flex" />
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {/* pb menghindari konten ketutup bottom nav di mobile.
                Akses nav mobile (Dompet/Pengaturan/logout) via avatar-menu di
                header Beranda — bukan lagi top bar "CallFin". */}
            <main className="flex-1 min-h-0 overflow-y-auto pb-20 lg:pb-0">{children}</main>
          </div>
        </div>
        <BottomNav />
        <WelcomeOnboarding />
      </CommandBarProvider>
    </StoreProvider>
  );
}
