"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Calendar,
  Clock,
  FolderKanban,
  FileText,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  ArrowRight,
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

interface SidebarProps {
  userRole?: string;
  userName?: string;
  userImage?: string;
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = userRole === "ADMIN" || userRole === "OWNER";

  return (
    <aside className="flex h-screen w-60 flex-col bg-[var(--sidebar-bg)] text-white">
      {/* 로고 */}
      <div className="flex h-16 items-center px-6 border-b border-white/10">
        <span className="font-serif text-xl font-bold text-white tracking-tight">
          daylog
        </span>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        <ul className="space-y-1 px-3">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
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

          {/* 관리자 전용 */}
          {isAdmin && (
            <li className="mt-4 pt-4 border-t border-white/10">
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-[var(--accent)] text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                )}
              >
                <Shield size={18} />
                관리자
                <ChevronRight size={14} className="ml-auto" />
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* 유저 프로필 + 로그아웃 */}
      <div className="border-t border-white/10 bg-black/20 px-4 py-3">
        {/* 프로필 행 */}
        <div className="flex items-center gap-3 mb-2">
          <div className="h-8 w-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-sm font-bold text-white shrink-0">
            {userName?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {userName ?? "사용자"}
            </p>
            <p className="text-xs text-white/50 capitalize">
              {userRole?.toLowerCase() ?? "member"}
            </p>
          </div>
        </div>
        {/* 로그아웃 버튼 — 이름 아래 들여쓰기 */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="ml-11 flex items-center gap-1 text-xs text-white/50 hover:text-red-400 transition-colors group"
        >
          <LogOut size={13} />
          로그아웃
          <ArrowRight size={11} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </button>
      </div>
    </aside>
  );
}
