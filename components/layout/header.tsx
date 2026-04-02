"use client";

import { useEffect, useState } from "react";
import { Bell, Menu, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface HeaderProps {
  onMenuClick?: () => void;
  title?: string;
  userRole?: string;
}

function resolvePageTitle(pathname: string, title?: string, userRole?: string) {
  if (title) {
    return title;
  }

  const isAdmin = userRole === "ADMIN" || userRole === "OWNER";

  if (pathname.startsWith("/notices")) return "공지사항";
  if (pathname.startsWith("/docs")) return "문서 작성";
  if (pathname.startsWith("/memo")) return "메모";
  if (pathname.startsWith("/projects")) return "프로젝트";
  if (pathname.startsWith("/attendance")) return isAdmin ? "근무 관리" : "출퇴근 현황";
  if (pathname.startsWith("/ideas")) return "아이디어";
  if (pathname.startsWith("/notifications")) return isAdmin ? "공지사항 전달" : "전달함";
  if (pathname.startsWith("/settings")) return "설정";
  if (pathname.startsWith("/calendar")) return "일정";

  return "내 워크스페이스";
}

export function Header({ onMenuClick, title, userRole }: HeaderProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const pageTitle = resolvePageTitle(pathname, title, userRole);
  const todayLabel = format(new Date(), "yyyy.MM.dd (eee)", { locale: ko });

  useEffect(() => {
    fetch("/api/notifications/unread-count")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.count != null) {
          setUnreadCount(data.count);
        }
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <header className="border-b border-[var(--border)] bg-white px-4 py-3 md:px-6">
      <div className="mx-auto flex w-full max-w-[var(--max-layout)] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button className="icon-button md:hidden" onClick={onMenuClick} aria-label="메뉴 열기">
            <Menu size={18} />
          </button>
          <h1 className="app-header-title truncate">{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-medium text-[var(--text-muted)] md:inline-flex">
            {todayLabel}
          </span>
          <Link href="/notifications" className="icon-button relative" aria-label="알림">
            <Bell size={17} />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-[var(--danger)] px-1.5 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>
          <button type="button" className="icon-button" aria-label="검색">
            <Search size={17} />
          </button>
          <Link href="/settings" className="icon-button" aria-label="설정">
            <Settings size={17} />
          </Link>
        </div>
      </div>
    </header>
  );
}
