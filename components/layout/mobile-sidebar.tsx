"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LogOut,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "대표",
  ADMIN: "관리자",
  MEMBER: "직원",
};

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  userRole?: string;
  userName?: string;
}

type NavItemConfig = {
  href: string;
  icon: string;
  label: string;
};

function isActivePath(pathname: string, href: string, source: string | null = null) {
  const [basePath] = href.split("?");
  if (basePath === "/") {
    return pathname === "/";
  }

  const isMeetingNoteFromNotices =
    pathname.startsWith("/docs/") &&
    (source === "notices" || source === "meeting-note");

  if (basePath === "/notices") {
    return pathname.startsWith("/notices") || isMeetingNoteFromNotices;
  }

  if (basePath === "/docs") {
    return pathname === "/docs" || (pathname.startsWith("/docs/") && !isMeetingNoteFromNotices);
  }

  return pathname.startsWith(basePath);
}

function NavItem({
  pathname,
  href,
  icon,
  label,
  source,
}: NavItemConfig & { pathname: string; source: string | null }) {
  const isActive = isActivePath(pathname, href, source);

  return (
    <li>
      <Link
        href={href}
        className={cn(
          "sidebar-nav-link group relative flex items-center gap-3 rounded-[14px] px-4 py-3 text-[13px] font-medium transition-all duration-150",
          isActive
            ? "bg-[var(--sidebar-active)] text-white"
            : "text-white/72 hover:bg-[var(--sidebar-hover)] hover:text-white"
        )}
      >
        <span
          className={cn(
            "absolute inset-y-2 left-0 w-1 rounded-full bg-[var(--accent)] transition-opacity",
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60"
          )}
        />
        <span className={cn("text-[17px] leading-none", isActive ? "text-[var(--accent)]" : "text-white/70 group-hover:text-white")}>
          {icon}
        </span>
        <span>{label}</span>
      </Link>
    </li>
  );
}

export function MobileSidebar({ open, onClose, userRole, userName }: MobileSidebarProps) {
  const pathname = usePathname();
  const [source, setSource] = useState<string | null>(null);
  const isAdmin = userRole === "ADMIN" || userRole === "OWNER";
  const isOwner = userRole === "OWNER";
  const showAdminCenterMenu = false;

  useEffect(() => {
    setSource(new URLSearchParams(window.location.search).get("source"));
  }, [pathname]);

  useEffect(() => {
    onClose();
  }, [onClose, pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const workspaceItems: NavItemConfig[] = [
    { href: "/", icon: "🏠", label: "내 워크스페이스" },
    { href: "/notices", icon: "📢", label: "공지사항" },
    { href: "/docs", icon: "📝", label: "문서 작성" },
    { href: "/memo", icon: "🗒️", label: "메모" },
  ];

  const projectItems: NavItemConfig[] = [
    { href: "/projects", icon: "📋", label: "프로젝트" },
  ];

  const documentItems: NavItemConfig[] = [
    { href: "/ideas", icon: "💡", label: "아이디어" },
    { href: "/notifications", icon: "📨", label: "전달함" },
  ];

  return (
    <>
      {open ? <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm md:hidden" onClick={onClose} /> : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[80] flex w-[20rem] flex-col border-r border-white/8 bg-[var(--sidebar-bg)] text-white transition-transform duration-300 md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)] text-sm font-bold text-white shadow-[0_12px_24px_rgba(79,124,255,0.28)]">
              DL
            </div>
            <div>
              <div className="text-base font-semibold tracking-[-0.02em] text-white">Daylog</div>
              <div className="mt-0.5 text-xs text-white/45">workspace operations</div>
            </div>
          </Link>
          <button onClick={onClose} className="text-white/70 transition-colors hover:text-white" aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <nav className="custom-scroll flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-6">
            <section className="space-y-2">
              <div className="sidebar-section-label">바로가기</div>
              <ul className="space-y-1.5">
                {workspaceItems.map((item) => (
                  <NavItem key={item.href} pathname={pathname} source={source} {...item} />
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <div className="sidebar-section-label">프로젝트</div>
              <ul className="space-y-1.5">
                {projectItems.map((item) => (
                  <NavItem key={item.href} pathname={pathname} source={source} {...item} />
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <div className="sidebar-section-label">근무관리</div>
              <ul className="space-y-1.5">
                <NavItem pathname={pathname} source={source} href="/attendance" icon="🕐" label="출퇴근 현황" />
              </ul>
            </section>

            <section className="space-y-2">
              <div className="sidebar-section-label">전달문서</div>
              <ul className="space-y-1.5">
                {documentItems.map((item) => (
                  <NavItem key={item.label} pathname={pathname} source={source} {...item} />
                ))}
              </ul>
            </section>

            {isOwner ? (
              <section className="space-y-2">
                <div className="sidebar-section-label">설정</div>
                <ul className="space-y-1.5">
                  <NavItem pathname={pathname} source={source} href="/settings" icon="⚙️" label="워크스페이스 설정" />
                </ul>
              </section>
            ) : null}
          </div>
        </nav>

        {isAdmin && showAdminCenterMenu ? (
          <div className="border-t border-white/8 px-4 py-3">
            <div className="sidebar-section-label px-0 pb-2">관리 센터</div>
            <div className="space-y-1.5">
              <Link href="/admin/dashboard" className="sidebar-nav-link group flex items-center gap-3 rounded-[14px] px-4 py-3 text-[13px] font-medium text-white/72 transition-all hover:bg-[var(--sidebar-hover)] hover:text-white">
                <ShieldCheck size={17} className="text-white/70 group-hover:text-white" />
                <span className="flex-1">관리 센터</span>
              </Link>
              <Link href="/settings" className="sidebar-nav-link group flex items-center gap-3 rounded-[14px] px-4 py-3 text-[13px] font-medium text-white/72 transition-all hover:bg-[var(--sidebar-hover)] hover:text-white">
                <Settings size={17} className="text-white/70 group-hover:text-white" />
                <span className="flex-1">설정</span>
              </Link>
            </div>
          </div>
        ) : null}

        <div className="border-t border-white/8 px-4 py-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-sm font-bold text-white">
                {userName?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{userName ?? "사용자"}</div>
                <div className="mt-0.5 text-xs text-white/45">
                  {ROLE_LABELS[userRole ?? "MEMBER"] ?? userRole ?? "직원"}
                </div>
              </div>
              <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-white/70 transition-colors hover:text-white" aria-label="로그아웃">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
