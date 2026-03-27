"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, isToday, isYesterday } from "date-fns";
import { ko } from "date-fns/locale";

type NotificationType = "MENTION" | "TASK_DUE" | "APPROVAL_REQUEST" | "APPROVAL_RESULT" | "ATTENDANCE_REMINDER" | "OVERTIME_ALERT";

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

const TYPE_ICONS: Record<NotificationType, string> = {
  MENTION: "💬",
  TASK_DUE: "⏰",
  APPROVAL_REQUEST: "📋",
  APPROVAL_RESULT: "✅",
  ATTENDANCE_REMINDER: "🕘",
  OVERTIME_ALERT: "⚡",
};

function groupByDate(notifications: Notification[]) {
  const groups: Record<string, Notification[]> = {};
  for (const n of notifications) {
    const d = new Date(n.createdAt);
    let key: string;
    if (isToday(d)) key = "오늘";
    else if (isYesterday(d)) key = "어제";
    else key = format(d, "M월 d일", { locale: ko });

    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  }
  return groups;
}

export function NotificationsClientPage({ initialNotifications }: Props) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const groups = groupByDate(notifications);

  async function markAllRead() {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (res.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  }

  async function markRead(id: string) {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    if (res.ok) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    }
  }

  function handleClick(notification: Notification) {
    if (!notification.isRead) markRead(notification.id);
    if (notification.link) router.push(notification.link);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h1 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1.5rem", fontWeight: 700, color: "#0D0D0D" }}>
            알림
          </h1>
          {unreadCount > 0 && (
            <span
              style={{
                background: "#F56B23",
                color: "#fff",
                borderRadius: "9999px",
                padding: "0.125rem 0.5rem",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              background: "none",
              border: "1px solid #E8E0C8",
              borderRadius: "0.5rem",
              padding: "0.375rem 0.875rem",
              fontSize: "0.875rem",
              color: "#555",
              cursor: "pointer",
            }}
          >
            모두 읽음
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #E8E0C8", borderRadius: "0.75rem", padding: "3rem", textAlign: "center" }}>
          <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🔔</p>
          <p style={{ color: "#999", fontSize: "0.875rem" }}>새로운 알림이 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {Object.entries(groups).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#999", marginBottom: "0.5rem" }}>
                {dateLabel}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {items.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                      padding: "1rem",
                      borderRadius: "0.75rem",
                      border: "1px solid #E8E0C8",
                      background: n.isRead ? "#FAF7EE" : "#fff",
                      cursor: n.link ? "pointer" : "default",
                      borderLeft: n.isRead ? "1px solid #E8E0C8" : "3px solid #F56B23",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (n.link) e.currentTarget.style.background = "#FEF0E8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = n.isRead ? "#FAF7EE" : "#fff";
                    }}
                  >
                    <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>
                      {TYPE_ICONS[n.type]}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.875rem", fontWeight: n.isRead ? 400 : 600, color: "#0D0D0D", marginBottom: "0.125rem" }}>
                        {n.title}
                      </p>
                      <p style={{ fontSize: "0.8125rem", color: "#555", marginBottom: "0.25rem", lineHeight: 1.4 }}>
                        {n.body}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "#999" }}>
                        {format(new Date(n.createdAt), "HH:mm", { locale: ko })}
                      </p>
                    </div>
                    {!n.isRead && (
                      <div style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: "#F56B23", flexShrink: 0, marginTop: "0.25rem" }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
