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
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "bg-[#F56B23] text-white"
                      : "text-[#999999] hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
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
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  pathname === "/dashboard"
                    ? "bg-[#F56B23] text-white"
                    : "text-[#999999] hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
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

      {/* 유저 프로필 + 로그아웃 (B) */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="h-8 w-8 rounded-full bg-[#F56B23] flex items-center justify-center text-sm font-bold text-white shrink-0">
          {userName?.[0]?.toUpperCase() ?? "U"}
        </div>
        <p className="text-sm font-medium text-white truncate flex-1 min-w-0">
          {userName ?? "사용자"}
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="p-1.5 rounded-md transition-colors shrink-0"
          style={{ color: "#888" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#888";
            e.currentTarget.style.background = "transparent";
          }}
          aria-label="로그아웃"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
