"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, isToday, isYesterday } from "date-fns";
import { ko } from "date-fns/locale";

type NotificationType =
  | "MENTION"
  | "TASK_DUE"
  | "APPROVAL_REQUEST"
  | "APPROVAL_RESULT"
  | "ATTENDANCE_REMINDER"
  | "OVERTIME_ALERT";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  link: string | null;
  createdAt: string | Date;
}

interface Props {
  initialNotifications: Notification[];
}

const TYPE_LABELS: Record<NotificationType, { icon: string; badge: string }> = {
  MENTION: { icon: "@", badge: "멘션" },
  TASK_DUE: { icon: "업무", badge: "업무" },
  APPROVAL_REQUEST: { icon: "결재", badge: "결재 요청" },
  APPROVAL_RESULT: { icon: "결과", badge: "결재 결과" },
  ATTENDANCE_REMINDER: { icon: "근무", badge: "근무 알림" },
  OVERTIME_ALERT: { icon: "추가", badge: "추가 근무" },
};

function groupByDate(notifications: Notification[]) {
  const groups: Record<string, Notification[]> = {};

  for (const notification of notifications) {
    const date = new Date(notification.createdAt);
    let key = format(date, "M월 d일", { locale: ko });

    if (isToday(date)) {
      key = "오늘";
    } else if (isYesterday(date)) {
      key = "어제";
    }

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(notification);
  }

  return groups;
}

export function NotificationsClientPage({ initialNotifications }: Props) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const groups = groupByDate(notifications);

  async function markAllRead() {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });

    if (response.ok) {
      setNotifications((previous) =>
        previous.map((notification) => ({ ...notification, isRead: true }))
      );
    }
  }

  async function markRead(id: string) {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });

    if (response.ok) {
      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === id ? { ...notification, isRead: true } : notification
        )
      );
    }
  }

  function handleClick(notification: Notification) {
    if (!notification.isRead) {
      void markRead(notification.id);
    }

    if (notification.link) {
      router.push(notification.link);
    }
  }

  return (
    <div className="page-shell">
      <section className="page-header">
        <div className="page-header__meta">
          <div className="page-header__eyebrow">Notification Inbox</div>
          <h1 className="page-title">전달함</h1>
          <p className="page-subtitle">
            전달 사항, 결재 요청, 근무 알림을 시간순으로 확인하고 필요한 화면으로 바로
            이동하세요.
          </p>
        </div>
        <div className="page-actions">
          {unreadCount > 0 ? (
            <span className="secondary-button">읽지 않은 항목 {unreadCount}</span>
          ) : null}
          {unreadCount > 0 ? (
            <button type="button" onClick={markAllRead} className="primary-button">
              모두 읽음 처리
            </button>
          ) : null}
        </div>
      </section>

      {notifications.length === 0 ? (
        <div className="empty-panel min-h-[260px]">
          <p className="empty-panel__title">도착한 알림이 없습니다.</p>
          <p className="empty-panel__description">
            새로운 전달 사항이나 결재 알림이 생기면 최신 순서대로 이 영역에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([dateLabel, items]) => (
            <section key={dateLabel} className="space-y-3">
              <div className="px-1 text-sm font-semibold text-[var(--text-primary)]">
                {dateLabel}
              </div>
              <div className="space-y-3">
                {items.map((notification) => {
                  const tone = TYPE_LABELS[notification.type];

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleClick(notification)}
                      className={`list-card w-full text-left ${
                        notification.link ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${
                            notification.isRead
                              ? "bg-[var(--surface-3)] text-[var(--text-secondary)]"
                              : "bg-[var(--accent-light)] text-[var(--accent)]"
                          }`}
                        >
                          {tone.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`status-badge ${
                                notification.isRead
                                  ? "status-badge--neutral"
                                  : "status-badge--accent"
                              }`}
                            >
                              {tone.badge}
                            </span>
                            {!notification.isRead ? (
                              <span className="status-badge status-badge--warning">NEW</span>
                            ) : null}
                          </div>
                          <p
                            className={`mt-3 text-sm ${
                              notification.isRead
                                ? "font-medium text-[var(--text-primary)]"
                                : "font-semibold text-[var(--text-primary)]"
                            }`}
                          >
                            {notification.title}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                            {notification.body}
                          </p>
                          <p className="mt-3 text-xs font-medium text-[var(--text-muted)]">
                            {format(new Date(notification.createdAt), "HH:mm", { locale: ko })}
                          </p>
                        </div>
                        {!notification.isRead ? (
                          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
