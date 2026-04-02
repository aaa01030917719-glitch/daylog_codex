"use client";

import { useState } from "react";
import { Copy, Check, Link } from "lucide-react";
import { createInviteUrl } from "@/lib/utils";

interface Props {
  inviteCode: string;
  workspaceName: string;
}

export function InviteCodePanel({ inviteCode, workspaceName }: Props) {
  const [copied, setCopied] = useState(false);

  function getInviteUrl() {
    return createInviteUrl(window.location.origin, inviteCode);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(getInviteUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #E8E0C8",
        borderRadius: "0.75rem",
        padding: "1.25rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <h2
        style={{
          fontFamily: "Noto Serif KR, serif",
          fontSize: "1.125rem",
          fontWeight: 600,
          color: "#0D0D0D",
          marginBottom: "0.5rem",
        }}
      >
        워크스페이스 초대
      </h2>
      <p style={{ fontSize: "0.875rem", color: "#999", marginBottom: "1rem" }}>
        구성원이 <strong style={{ color: "#0D0D0D" }}>{workspaceName}</strong>에 참여할 수 있도록
        초대 링크를 공유해 주세요.
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          background: "#FAF7EE",
          border: "1px solid #E8E0C8",
          borderRadius: "0.625rem",
          padding: "0.75rem 1rem",
        }}
      >
        <Link size={16} style={{ color: "#999", flexShrink: 0 }} />
        <code
          style={{
            flex: 1,
            fontSize: "0.8125rem",
            fontFamily: "monospace",
            color: "#555",
            wordBreak: "break-all",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {typeof window !== "undefined"
            ? createInviteUrl(window.location.origin, inviteCode)
            : `/invite/${inviteCode}`}
        </code>
        <button
          onClick={handleCopy}
          title="초대 링크 복사"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            background: copied ? "#2A8C50" : "#F56B23",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.5rem 0.875rem",
            fontSize: "0.8125rem",
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
            transition: "background 0.2s",
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "복사됨" : "링크 복사"}
        </button>
      </div>

      <p style={{ fontSize: "0.8125rem", color: "#999", marginTop: "0.625rem" }}>
        링크를 열면 코드 입력 없이 바로 참여할 수 있습니다.
      </p>
    </section>
  );
}
