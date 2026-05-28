import { Sidebar } from "@/components/layout/Sidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { StoreProvider } from "@/lib/store";
import { WelcomeOnboarding } from "@/components/onboarding/WelcomeOnboarding";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar className="hidden lg:flex" />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <MobileHeader />
          <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
        </div>
      </div>
      <WelcomeOnboarding />
    </StoreProvider>
  );
}
