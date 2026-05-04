"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { QuickAddFAB } from "@/components/ui/QuickAddFAB";
import { usePushNotification } from "@/hooks/usePushNotification";
import {
  WORKSPACE_THEME_EVENT,
  WORKSPACE_THEME_STORAGE_KEY,
  createThemeCssVariables,
  normalizeThemeColor,
} from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [themeColor, setThemeColor] = useState<string | null>(null);
  usePushNotification();

  const user = session?.user;
  const isCalendarRoute = pathname.startsWith("/calendar");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedThemeColor = window.localStorage.getItem(WORKSPACE_THEME_STORAGE_KEY);
    if (storedThemeColor) {
      setThemeColor(normalizeThemeColor(storedThemeColor));
    }
  }, []);

  useEffect(() => {
    function handleThemeChange(event: Event) {
      const detail = (event as CustomEvent<{ themeColor?: string | null }>).detail;
      setThemeColor(normalizeThemeColor(detail?.themeColor));
    }

    window.addEventListener(WORKSPACE_THEME_EVENT, handleThemeChange as EventListener);
    return () => {
      window.removeEventListener(WORKSPACE_THEME_EVENT, handleThemeChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!user?.workspaceId) {
      setThemeColor(null);
      return;
    }

    let cancelled = false;

    async function loadWorkspaceTheme() {
      try {
        const response = await fetch("/api/workspace", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { themeColor?: string | null };
        const nextThemeColor = normalizeThemeColor(data.themeColor);
        if (cancelled) {
          return;
        }

        setThemeColor(nextThemeColor);
        window.localStorage.setItem(WORKSPACE_THEME_STORAGE_KEY, nextThemeColor);
      } catch {
        // Keep the current theme color fallback when the workspace theme cannot be loaded.
      }
    }

    void loadWorkspaceTheme();

    return () => {
      cancelled = true;
    };
  }, [user?.workspaceId]);

  return (
    <div
      className="flex h-screen overflow-hidden bg-[var(--background)]"
      style={createThemeCssVariables(themeColor) as React.CSSProperties}
    >
      <div className="hidden md:flex md:shrink-0">
        <Sidebar
          userRole={user?.role}
          userName={user?.name ?? undefined}
          userImage={user?.image ?? undefined}
        />
      </div>

      <MobileSidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        userRole={user?.role}
        userName={user?.name ?? undefined}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {isCalendarRoute ? (
          <div className="md:hidden">
            <Header
              onMenuClick={() => setMobileSidebarOpen(true)}
              userRole={user?.role}
            />
          </div>
        ) : (
          <Header
            onMenuClick={() => setMobileSidebarOpen(true)}
            userRole={user?.role}
          />
        )}

        <main className={isCalendarRoute ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto"}>
          <div className={isCalendarRoute ? "h-full w-full" : "w-full px-4 pb-24 pt-6 md:px-6 md:pb-8 md:pt-7"}>
            {children}
          </div>
        </main>
      </div>

      <MobileTabBar />
      {isCalendarRoute ? null : <QuickAddFAB />}
    </div>
  );
}
