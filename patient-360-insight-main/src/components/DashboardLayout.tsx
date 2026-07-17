import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalSearch } from "@/components/GlobalSearch";
import {useAuth} from "@/context/AuthContext";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const {role} = useAuth();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-4 border-b border-border bg-card px-4">
            <SidebarTrigger className="text-foreground" />
            <h1 className="font-display text-lg font-semibold text-foreground hidden sm:block">
              Patient 360°
            </h1>
            <div className="ml-auto w-full max-w-md">
              <GlobalSearch />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
