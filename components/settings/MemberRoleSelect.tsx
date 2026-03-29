"use client";

import { useState, useRef } from "react";

interface Props {
  memberId: string;
  currentRole: string;
}

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "관리자" },
  { value: "MEMBER", label: "직원" },
];

export function MemberRoleSelect({ memberId, currentRole }: Props) {
  const [role, setRole] = useState(currentRole);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleChange(newRole: string) {
    if (newRole === role) return;
    setStatus("saving");

    try {
      const res = await fetch(`/api/workspace/members/${memberId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        setRole(newRole);
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setStatus("idle"), 2000);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <select
        value={role}
        onChange={(e) => handleChange(e.target.value)}
        disabled={status === "saving"}
        style={{
          border: "1px solid #E8E0C8",
          borderRadius: "6px",
          padding: "4px 8px",
          fontSize: "12px",
          color: "#0D0D0D",
          background: "#fff",
          cursor: status === "saving" ? "not-allowed" : "pointer",
          outline: "none",
          opacity: status === "saving" ? 0.6 : 1,
        }}
        onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
        onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
      >
        {ROLE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {status === "saving" && (
        <span style={{ fontSize: "11px", color: "#999" }}>저장 중...</span>
      )}
      {status === "success" && (
        <span style={{ fontSize: "11px", color: "#15803d", fontWeight: 600 }}>✓ 변경됨</span>
      )}
      {status === "error" && (
        <span style={{ fontSize: "11px", color: "#c53030", fontWeight: 600 }}>✗ 실패</span>
      )}
    </div>
  );
}
