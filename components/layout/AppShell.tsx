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

type AppShellUser = {
  name?: string | null;
  role?: string | null;
  image?: string | null;
  workspaceId?: string | null;
};

export function AppShell({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: AppShellUser | null;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [themeColor, setThemeColor] = useState<string | null>(null);
  usePushNotification();

  const sessionUser = session?.user;
  const resolvedUser = {
    name: sessionUser?.name ?? initialUser?.name ?? undefined,
    role: sessionUser?.role ?? initialUser?.role ?? undefined,
    image: sessionUser?.image ?? initialUser?.image ?? undefined,
    workspaceId: sessionUser?.workspaceId ?? initialUser?.workspaceId ?? undefined,
  };
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
    if (!resolvedUser.workspaceId) {
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
  }, [resolvedUser.workspaceId]);

  return (
    <div
      className="flex h-screen overflow-hidden bg-[var(--background)]"
      style={createThemeCssVariables(themeColor) as React.CSSProperties}
    >
      <div className="hidden md:flex md:shrink-0">
        <Sidebar
          userRole={resolvedUser.role}
          userName={resolvedUser.name}
          userImage={resolvedUser.image}
        />
      </div>

      <MobileSidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        userRole={resolvedUser.role}
        userName={resolvedUser.name}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {isCalendarRoute ? (
          <div className="md:hidden">
            <Header
              onMenuClick={() => setMobileSidebarOpen(true)}
              userRole={resolvedUser.role}
            />
          </div>
        ) : (
          <Header
            onMenuClick={() => setMobileSidebarOpen(true)}
            userRole={resolvedUser.role}
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
