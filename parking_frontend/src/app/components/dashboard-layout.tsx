import { useState } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" dir="rtl">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden border-l border-border transition-all duration-300 lg:block ${
          isSidebarCollapsed ? "w-20" : "w-72"
        }`}
      >
        <AppSidebar isCollapsed={isSidebarCollapsed} />
      </aside>

      {/* Mobile Sidebar */}
      {isMobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="fixed right-0 top-0 z-50 h-full w-72 lg:hidden">
            <AppSidebar />
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopbar onMenuClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
