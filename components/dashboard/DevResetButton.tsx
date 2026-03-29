"use client";

import { useState } from "react";

export function DevResetButton() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleReset() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/dev/reset", { method: "POST" });
      const data = await res.json();
      setMessage(res.ok ? "✅ 초기화 완료" : `❌ ${data.error}`);
    } catch {
      setMessage("❌ 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <section
      style={{
        background: "#FFF5F5",
        border: "1px solid #FCA5A5",
        borderRadius: "0.75rem",
        padding: "1.25rem",
        marginTop: "1.25rem",
      }}
    >
      <h2
        style={{
          fontFamily: "Noto Serif KR, serif",
          fontSize: "1rem",
          fontWeight: 600,
          color: "#DC2626",
          marginBottom: "0.5rem",
        }}
      >
        ⚠️ 개발용 — 테스트 데이터 초기화
      </h2>
      <p style={{ fontSize: "0.8125rem", color: "#991B1B", marginBottom: "1rem" }}>
        BoardPost, Comment, Attendance, Task, Project, Event, Approval 데이터를 삭제합니다.
        User·Workspace·WorkspaceMember는 유지됩니다.
      </p>

      {message && (
        <p style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: message.startsWith("✅") ? "#166534" : "#DC2626" }}>
          {message}
        </p>
      )}

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          style={{
            padding: "0.625rem 1.25rem",
            background: "#DC2626",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          테스트 데이터 초기화
        </button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <p style={{ fontSize: "0.875rem", color: "#DC2626", fontWeight: 500 }}>
            정말 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </p>
          <button
            onClick={handleReset}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              background: "#DC2626",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "초기화 중..." : "확인"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              color: "#555",
              border: "1px solid #E8E0C8",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            취소
          </button>
        </div>
      )}
    </section>
  );
}
