"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Calendar, Clock, FolderKanban,
  FileText, Bell, Shield, LogOut, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "대시보드" },
  { href: "/calendar", icon: Calendar, label: "일정" },
  { href: "/attendance", icon: Clock, label: "출퇴근" },
  { href: "/projects", icon: FolderKanban, label: "프로젝트" },
  { href: "/docs", icon: FileText, label: "문서" },
  { href: "/notifications", icon: Bell, label: "알림" },
];

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  userRole?: string;
  userName?: string;
}

export function MobileSidebar({ open, onClose, userRole, userName }: MobileSidebarProps) {
  const pathname = usePathname();
  const isAdmin = userRole === "ADMIN" || userRole === "OWNER";

  // 라우트 변경 시 닫기
  useEffect(() => { onClose(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // 스크롤 잠금
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* 슬라이드 사이드바 */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[var(--sidebar-bg)] text-white transition-transform duration-300 md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-white/10">
          <span className="font-serif text-xl font-bold text-white">daylog</span>
          <button
            onClick={onClose}
            className="p-1 text-white/60 hover:text-white"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          <ul className="space-y-1 px-3">
            {navItems.map(({ href, icon: Icon, label }) => {
              const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[var(--accent)] text-white"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                </li>
              );
            })}
            {isAdmin && (
              <li className="mt-4 pt-4 border-t border-white/10">
                <Link
                  href="/dashboard"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                    pathname.startsWith("/admin")
                      ? "bg-[var(--accent)] text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Shield size={18} />
                  관리자
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-sm font-bold text-white shrink-0">
              {userName?.[0]?.toUpperCase() ?? "U"}
            </div>
            <p className="text-sm font-medium text-white truncate">{userName ?? "사용자"}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </aside>
    </>
  );
}
