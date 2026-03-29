"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Calendar, Clock,
  FolderKanban, FileText, Bell, LogOut, X,
  Settings, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "대표",
  ADMIN: "관리자",
  MEMBER: "직원",
};

const divider = (
  <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "8px 18px" }} />
);

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  userRole?: string;
  userName?: string;
}

export function MobileSidebar({ open, onClose, userRole, userName }: MobileSidebarProps) {
  const pathname = usePathname();
  const isOwner = userRole === "OWNER";
  const isAdmin = userRole === "ADMIN";

  useEffect(() => { onClose(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function NavItem({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
    const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <li>
        <Link
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors duration-150",
            isActive ? "bg-[#F56B23] text-white" : "text-[#aaa] hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
          )}
        >
          <Icon size={16} />
          {label}
        </Link>
      </li>
    );
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[var(--sidebar-bg)] text-white transition-transform duration-300 md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-white/10">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <div style={{
                width: "32px", height: "32px", background: "#F56B23", borderRadius: "8px",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: "14px", fontWeight: 700, flexShrink: 0,
              }}>D</div>
              <span style={{ color: "#fff", fontSize: "16px", fontWeight: 700 }}>Daylog</span>
            </div>
          </Link>
          <button onClick={onClose} className="p-1 text-white/60 hover:text-white" aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide">
          <ul className="space-y-0.5 px-3">
            <NavItem href="/" icon={LayoutDashboard} label="대시보드" />
            <NavItem href="/projects" icon={FolderKanban} label="프로젝트" />
            <NavItem href="/calendar" icon={Calendar} label="일정" />
            <NavItem href="/docs" icon={FileText} label="문서" />
            {/* MEMBER만 알림 표시 */}
            {!isOwner && !isAdmin && (
              <NavItem href="/notifications" icon={Bell} label="알림" />
            )}
          </ul>

          {divider}

          <ul className="space-y-0.5 px-3">
            {isOwner ? (
              <NavItem href="/attendance" icon={Clock} label="출퇴근 관리" />
            ) : (
              <NavItem href="/attendance" icon={Clock} label="출퇴근" />
            )}
          </ul>

          {isOwner && (
            <>
              {divider}
              <ul className="space-y-0.5 px-3">
                <NavItem href="/admin/dashboard" icon={ShieldCheck} label="관리자" />
              </ul>
            </>
          )}

          {isAdmin && (
            <>
              {divider}
              <ul className="space-y-0.5 px-3">
                <NavItem href="/admin/dashboard" icon={ShieldCheck} label="관리자" />
              </ul>
            </>
          )}

          {isOwner && (
            <>
              {divider}
              <ul className="space-y-0.5 px-3">
                <NavItem href="/settings" icon={Settings} label="설정" />
              </ul>
            </>
          )}
        </nav>

        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="h-8 w-8 rounded-full bg-[#F56B23] flex items-center justify-center text-sm font-bold text-white shrink-0">
            {userName?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName ?? "사용자"}</p>
            {userRole && (
              <p style={{ fontSize: "11px", color: "#888", marginTop: "1px" }}>
                {ROLE_LABELS[userRole] ?? userRole}
              </p>
            )}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1.5 rounded-md transition-colors shrink-0"
            style={{ color: "#888" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#888"; e.currentTarget.style.background = "transparent"; }}
            aria-label="로그아웃"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
