"use client";

import { useState } from "react";

function DevResetButtonInner() {
  const [loading, setLoading] = useState(false);
  const showFloatingBanner = false;

  async function handleClick() {
    const ok = window.confirm("워크스페이스 데이터를 초기화합니다. 계속할까요?");
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch("/api/dev/reset", { method: "POST" });
      if (res.ok) {
        window.location.href = "/login";
      } else {
        const data = await res.json();
        alert(data.error ?? "초기화 중 오류가 발생했습니다.");
      }
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      aria-hidden={!showFloatingBanner}
      hidden={!showFloatingBanner}
      style={{
        position: "fixed",
        bottom: "80px",
        right: "16px",
        zIndex: 40,
        background: "#DC2626",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        padding: "8px 14px",
        fontSize: "12px",
        fontWeight: 600,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
        boxShadow: "0 2px 8px rgba(220,38,38,0.4)",
        whiteSpace: "nowrap",
        transition: "background 150ms ease",
      }}
      onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#B91C1C"; }}
      onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#DC2626"; }}
    >
      {loading ? "초기화 중..." : "🔄 테스트 초기화"}
    </button>
  );
}

export function DevResetButton() {
  if (process.env.NODE_ENV !== "development") return null;
  return <DevResetButtonInner />;
}
