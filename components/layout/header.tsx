"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Menu, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ErrorReportModal } from "@/components/feedback/ErrorReportModal";

const NOTIFICATION_SYNC_EVENT = "daylog:notifications-sync";

interface HeaderProps {
  onMenuClick?: () => void;
  title?: string;
  userRole?: string;
}

interface HeaderNotificationItem {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  link: string | null;
  createdAt: string | Date;
}

function renderRejectedWordHighlight(value: string) {
  const parts = value.split(/(거절|반려)/g);

  return parts.map((part, index) =>
    part === "거절" || part === "반려" ? (
      <span key={`${part}-${index}`} className="text-red-600">
        {part}
      </span>
    ) : (
      part
    )
  );
}

function resolvePageTitle(pathname: string, title?: string, userRole?: string) {
  if (title) {
    return title;
  }

  const isAdmin = userRole === "ADMIN" || userRole === "OWNER";

  if (pathname.startsWith("/subscriptions")) return "구독 서비스 관리";
  if (pathname.startsWith("/approvals")) return "결재 요청";
  if (pathname.startsWith("/notices")) return "공지사항";
  if (pathname.startsWith("/docs")) return "휴가·결재";
  if (pathname.startsWith("/memo")) return "내 메모";
  if (pathname.startsWith("/projects")) return "프로젝트";
  if (pathname.startsWith("/attendance")) return isAdmin ? "팀 출퇴근" : "내 출퇴근";
  if (pathname.startsWith("/ideas")) return "아이디어";
  if (pathname.startsWith("/notifications")) return "전달함";
  if (pathname.startsWith("/settings")) return "설정";
  if (pathname.startsWith("/calendar")) return "일정";

  return "홈";
}

export function Header({ onMenuClick, title, userRole }: HeaderProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isErrorReportOpen, setIsErrorReportOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotificationItem[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const previewCloseTimerRef = useRef<number | null>(null);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const pageTitle = resolvePageTitle(pathname, title, userRole);
  const todayLabel = format(new Date(), "yyyy.MM.dd (eee)", { locale: ko });

  async function refreshUnreadCount() {
    const response = await fetch("/api/notifications/unread-count");
    const data = response.ok ? await response.json() : null;
    if (data?.count != null) {
      setUnreadCount(data.count);
    }
  }

  async function loadNotifications() {
    setLoadingPreview(true);
    try {
      const response = await fetch("/api/notifications");
      const data = response.ok ? await response.json() : null;
      setNotifications(data?.notifications ?? []);
    } finally {
      setLoadingPreview(false);
    }
  }

  useEffect(() => {
    void refreshUnreadCount();
  }, [pathname]);

  useEffect(() => {
    function handleNotificationSync() {
      void refreshUnreadCount();

      if (previewOpen) {
        void loadNotifications();
      }
    }

    window.addEventListener(NOTIFICATION_SYNC_EVENT, handleNotificationSync);

    return () => {
      window.removeEventListener(NOTIFICATION_SYNC_EVENT, handleNotificationSync);
    };
  }, [previewOpen]);

  useEffect(() => {
    const errorReportModalApi = {
      open: () => setIsErrorReportOpen(true),
      close: () => setIsErrorReportOpen(false),
    };

    (
      window as typeof window & {
        ErrorReportModal?: typeof errorReportModalApi;
      }
    ).ErrorReportModal = errorReportModalApi;

    return () => {
      (
        window as typeof window & {
          ErrorReportModal?: typeof errorReportModalApi;
        }
      ).ErrorReportModal = undefined;
    };
  }, []);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 30);

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (searchWrapRef.current?.contains(target)) {
        return;
      }

      setSearchOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [searchOpen]);

  async function updateAllReadState(nextRead: boolean) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextRead ? { all: true } : { allUnread: true }),
    });
    setNotifications((current) => current.map((item) => ({ ...item, isRead: nextRead })));
    setUnreadCount(nextRead ? 0 : notifications.length);
    window.dispatchEvent(new Event(NOTIFICATION_SYNC_EVENT));
  }

  function openPreview() {
    if (previewCloseTimerRef.current) {
      window.clearTimeout(previewCloseTimerRef.current);
      previewCloseTimerRef.current = null;
    }

    setPreviewOpen(true);
    if (notifications.length === 0) {
      void loadNotifications();
    }
  }

  function closePreviewWithDelay() {
    if (previewCloseTimerRef.current) {
      window.clearTimeout(previewCloseTimerRef.current);
    }

    previewCloseTimerRef.current = window.setTimeout(() => {
      setPreviewOpen(false);
      previewCloseTimerRef.current = null;
    }, 300);
  }

  return (
    <>
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
            <div className="relative" onMouseEnter={openPreview} onMouseLeave={closePreviewWithDelay}>
              <button type="button" className="icon-button relative" aria-label="알림">
                <Bell size={17} />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-[var(--danger)] px-1.5 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </button>

              {previewOpen ? (
                <div className="absolute right-0 top-[calc(100%+10px)] z-[70] w-[320px] rounded-[14px] border border-[var(--border)] bg-white p-2.5 shadow-[var(--shadow-lg)]">
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--border-light)] px-1 pb-2.5">
                    <div>
                      <div className="text-[15px] font-bold text-[var(--text-primary)]">알림</div>
                    </div>
                    <button
                      type="button"
                      className="rounded-[var(--radius-sm)] px-1.5 py-1 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-light)]"
                      onClick={() => void updateAllReadState(true)}
                    >
                      모두 읽음
                    </button>
                  </div>

                  <div className="mt-2 max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
                    {loadingPreview ? (
                      <div className="px-2 py-6 text-center text-sm text-[var(--text-muted)]">알림을 불러오는 중입니다.</div>
                    ) : notifications.length === 0 ? (
                      <div className="px-2 py-6 text-center text-sm text-[var(--text-muted)]">표시할 알림이 없습니다.</div>
                    ) : (
                      notifications.slice(0, 6).map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => {
                              window.location.href = "/notifications";
                            }}
                            className="w-full rounded-[10px] border border-[var(--border-light)] bg-[var(--surface)] px-3 py-2 text-left transition hover:border-[#d1d5db] hover:bg-[var(--surface-2)]"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-light)] text-[var(--accent)]">
                                <Bell size={14} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="line-clamp-1 text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
                                    {renderRejectedWordHighlight(notification.title)}
                                  </div>
                                  {!notification.isRead ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" /> : null}
                                </div>
                                <div className="line-clamp-2 text-[11.5px] leading-4 text-[var(--text-muted)]">
                                  {renderRejectedWordHighlight(notification.body)}
                                </div>
                              </div>
                            </div>
                          </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <div ref={searchWrapRef} className="relative flex items-center gap-2">
              <button
                type="button"
                className="icon-button"
                aria-label="검색"
                onClick={() => setSearchOpen((current) => !current)}
              >
                <Search size={17} />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  searchOpen ? "w-[220px] opacity-100" : "w-0 opacity-0"
                }`}
              >
                <input
                  ref={searchInputRef}
                  type="text"
                  className="form-input h-[38px] w-[220px]"
                  placeholder="검색어를 입력해 주세요"
                />
              </div>
            </div>
            <Link href="/settings" className="icon-button" aria-label="설정">
              <Settings size={17} />
            </Link>
          </div>
        </div>
      </header>

      <ErrorReportModal
        open={isErrorReportOpen}
        currentPath={pathname}
        onClose={() => setIsErrorReportOpen(false)}
      />
    </>
  );
}
