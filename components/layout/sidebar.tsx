"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  LogOut,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "대표",
  ADMIN: "관리자",
  MEMBER: "직원",
};

interface SidebarProps {
  userRole?: string;
  userName?: string;
  userImage?: string;
}

interface SidebarProjectItem {
  id: string;
  name: string;
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
        <span className="flex-1">{label}</span>
      </Link>
    </li>
  );
}

function ErrorReportButton() {
  return (
    <button
      type="button"
      onClick={() => {
        (
          window as typeof window & {
            ErrorReportModal?: { open: () => void };
          }
        ).ErrorReportModal?.open();
      }}
      className="sidebar-nav-link group relative flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-[13px] font-medium text-white/58 transition-all duration-150 hover:bg-[var(--sidebar-hover)] hover:text-white"
    >
      <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-60" />
      <AlertCircle size={17} className="text-white/55 group-hover:text-white" />
      <span className="flex-1">피드백 보내기</span>
    </button>
  );
}

function SidebarProjectMenu({ pathname }: { pathname: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<SidebarProjectItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isProjectsActive = isActivePath(pathname, "/projects");

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;
    setLoadingProjects(true);

    void fetch("/api/projects")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("프로젝트 목록을 불러오지 못했습니다.");
        }

        return response.json() as Promise<{
          projects?: Array<{ id?: string; name?: string }>;
        }>;
      })
      .then((data) => {
        if (cancelled) {
          return;
        }

        const nextProjects = (data.projects ?? [])
          .filter(
            (project): project is { id: string; name: string } =>
              typeof project?.id === "string" &&
              project.id.trim().length > 0 &&
              typeof project?.name === "string" &&
              project.name.trim().length > 0
          )
          .map((project) => ({
            id: project.id,
            name: project.name,
          }));

        setProjects(nextProjects);
      })
      .catch(() => {
        if (!cancelled) {
          setProjects([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingProjects(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  return (
    <div ref={ref} className="space-y-1.5">
      <div
        className={cn(
          "mx-2 my-0.5 flex items-center overflow-hidden rounded-md transition-colors hover:bg-[#22252d]",
          isProjectsActive ? "bg-[#2a2d36]" : "bg-transparent"
        )}
      >
        <Link
          href="/projects"
          className={cn(
            "flex flex-1 items-center gap-2 px-3 py-1.5 text-[13px] transition-colors",
            isProjectsActive ? "text-white" : "text-[#9ca3af] hover:text-white"
          )}
        >
          <span className="text-[17px] leading-none opacity-70">📋</span>
          <span>프로젝트</span>
        </Link>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className="flex h-8 w-7 shrink-0 items-center justify-center border-l border-transparent text-[#4b5563] transition-all hover:border-white/10 hover:text-[#9ca3af]"
          aria-label="프로젝트 목록 열기"
          aria-expanded={isOpen}
        >
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
        </button>
      </div>

      {isOpen ? (
        <div className="ml-5 mr-2 py-1">
          <div className="max-h-[280px] space-y-1 overflow-y-auto rounded-md border border-white/5 bg-white/[0.03] p-2">
            {loadingProjects ? (
              <div className="px-2.5 py-2 text-[11px] leading-5 text-[#7c8596]">
                프로젝트 목록을 불러오는 중입니다.
              </div>
            ) : projects.length === 0 ? (
              <div className="px-2.5 py-2 text-[11px] leading-5 text-[#7c8596]">
                등록된 프로젝트가 없습니다.
              </div>
            ) : (
              projects.map((project) => {
                const isActiveProject =
                  pathname === `/projects/${project.id}` ||
                  pathname.startsWith(`/projects/${project.id}/`);

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex w-full items-center rounded-md px-2.5 py-2 text-left text-[12px] transition-colors",
                      isActiveProject
                        ? "bg-white/8 text-[var(--accent)]"
                        : "text-[#c7ced9] hover:bg-white/6 hover:text-white"
                    )}
                  >
                    <span className="truncate">{project.name}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const [source, setSource] = useState<string | null>(null);
  const isAdmin = userRole === "ADMIN" || userRole === "OWNER";
  const canOpenSettings = Boolean(userRole);
  const showAdminCenterMenu = false;

  useEffect(() => {
    setSource(new URLSearchParams(window.location.search).get("source"));
  }, [pathname]);

  const mainItems: NavItemConfig[] = [
    { href: "/", icon: "🏠", label: "홈" },
    { href: "/notifications", icon: "📨", label: "전달함" },
    { href: "/notices", icon: "📢", label: "공지사항" },
    { href: "/memo", icon: "🗒️", label: "내 메모" },
    { href: "/calendar", icon: "📅", label: "일정관리" },
  ];

  const workItems: NavItemConfig[] = [
    { href: "/ideas", icon: "💡", label: "아이디어" },
    ...(isAdmin ? [{ href: "/subscriptions", icon: "💳", label: "구독 서비스" }] : []),
  ];

  const attendanceItems: NavItemConfig[] = [
    { href: "/attendance", icon: "🕐", label: "팀 출퇴근" },
    { href: "/docs", icon: "📝", label: "휴가·결재" },
  ];

  return (
    <aside className="flex h-screen w-[17rem] flex-col bg-[var(--sidebar-bg)] text-white">
      <div className="px-5 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)] text-sm font-bold text-white shadow-[0_12px_24px_rgba(79,124,255,0.28)]">
            DL
          </div>
          <div>
            <div className="text-base font-semibold tracking-[-0.02em] text-white">Daylog</div>
            <div className="mt-0.5 text-xs text-white/45">workspace operations</div>
          </div>
        </Link>
      </div>

      <nav className="custom-scroll flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          <section className="space-y-2">
            <div className="sidebar-section-label">주요 메뉴</div>
            <ul className="space-y-1.5">
              {mainItems.map((item) => (
                <NavItem key={item.href} pathname={pathname} source={source} {...item} />
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <div className="sidebar-section-label">업무 관리</div>
            <SidebarProjectMenu pathname={pathname} />
            <ul className="space-y-1.5">
              {workItems.map((item) => (
                <NavItem key={item.href} pathname={pathname} source={source} {...item} />
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <div className="sidebar-section-label">근태·결재</div>
            <ul className="space-y-1.5">
              {attendanceItems.map((item) => (
                <NavItem key={item.href} pathname={pathname} source={source} {...item} />
              ))}
            </ul>
          </section>

          {canOpenSettings ? (
            <section className="space-y-2">
              <div className="sidebar-section-label">설정</div>
              <ul className="space-y-1.5">
                <NavItem pathname={pathname} source={source} href="/settings" icon="⚙️" label="워크스페이스 설정" />
              </ul>
            </section>
          ) : null}

          <section className="space-y-2">
            <div className="sidebar-section-label">지원</div>
            <div className="space-y-1.5">
              <ErrorReportButton />
            </div>
          </section>
        </div>
      </nav>

      {isAdmin && showAdminCenterMenu ? (
        <div className="px-4 py-3">
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

      <div className="px-4 py-4">
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
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-white/70 transition-colors hover:text-white"
              aria-label="로그아웃"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
