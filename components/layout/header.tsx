"use client";

import { useEffect, useState } from "react";
import { Menu, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderProps {
  onMenuClick?: () => void;
  title?: string;
}

export function Header({ onMenuClick, title }: HeaderProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/notifications/unread-count")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.count != null) setUnreadCount(d.count); })
      .catch(() => {});
  }, [pathname]);

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-white px-4 md:px-6">
      {/* 모바일 햄버거 */}
      <button
        className="flex items-center justify-center rounded-md p-2 text-[var(--text-sub)] hover:bg-[var(--bg-light)] md:hidden"
        onClick={onMenuClick}
        aria-label="메뉴 열기"
      >
        <Menu size={22} />
      </button>

      {/* 타이틀 (데스크톱에서만 표시) */}
      {title && (
        <h1 className="hidden md:block font-serif text-lg font-semibold text-[var(--text-title)]">
          {title}
        </h1>
      )}

      {/* 로고 (모바일) */}
      <span className="font-serif text-lg font-bold text-[var(--text-title)] md:hidden">
        daylog
      </span>

      {/* 우측 액션 */}
      <div className="flex items-center gap-2">
        <Link
          href="/notifications"
          className="relative flex items-center justify-center rounded-md p-2 text-[var(--text-sub)] hover:bg-[var(--bg-light)]"
          aria-label="알림"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span
              className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: "#F56B23", minWidth: "1rem" }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
