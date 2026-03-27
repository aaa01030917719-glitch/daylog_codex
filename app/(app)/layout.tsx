"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { CheckOutPopup } from "@/app/components/attendance/CheckOutPopup";
import { usePushNotification } from "@/hooks/usePushNotification";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  usePushNotification();

  const user = session?.user;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-light)]">
      {/* 데스크톱 사이드바 */}
      <div className="hidden md:flex md:shrink-0">
        <Sidebar
          userRole={user?.role}
          userName={user?.name ?? undefined}
          userImage={user?.image ?? undefined}
        />
      </div>

      {/* 모바일 슬라이드 사이드바 */}
      <MobileSidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        userRole={user?.role}
        userName={user?.name ?? undefined}
      />

      {/* 메인 영역 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-layout px-4 py-6 md:px-6 pb-20 md:pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* 모바일 탭바 */}
      <MobileTabBar />

      {/* 퇴근 팝업 — 출근 후 퇴근 전에 모든 페이지에서 표시 */}
      <CheckOutPopup />
    </div>
  );
}
