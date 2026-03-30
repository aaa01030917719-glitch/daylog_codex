"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Building2, LogIn, Copy, Check } from "lucide-react";
import { useState } from "react";

interface Props {
  open: boolean;
  workspaceName: string;
  inviteCode: string;
}

export function WorkspaceSuccessModal({ open, workspaceName, inviteCode }: Props) {
  const [copied, setCopied] = useState(false);

  function handleEnter() {
    window.location.href = "/";
  }

  async function handleCopyInvite() {
    const url = `${window.location.origin}/invite/${inviteCode}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50 }}
        />
        <DialogPrimitive.Content
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 51,
            background: "#fff",
            borderRadius: "1rem",
            padding: "2rem",
            maxWidth: "24rem",
            width: "calc(100% - 2rem)",
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }}
        >
          {/* 아이콘 */}
          <div
            style={{
              width: "5rem",
              height: "5rem",
              borderRadius: "50%",
              background: "#E8F7EE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}
          >
            <Building2 size={40} style={{ color: "#2A8C50" }} />
          </div>

          {/* 제목 */}
          <h2
            style={{
              fontFamily: "Noto Serif KR, serif",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#0D0D0D",
              marginBottom: "0.75rem",
            }}
          >
            워크스페이스가 생성되었습니다!
          </h2>

          {/* 워크스페이스 이름 배지 */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.75rem" }}>
            <span
              style={{
                display: "inline-block",
                padding: "0.25rem 0.875rem",
                background: "#FEF0E8",
                color: "#F56B23",
                borderRadius: "9999px",
                fontSize: "0.875rem",
                fontWeight: 600,
                             }}
            >
              {workspaceName}
            </span>
          </div>

          {/* 본문 */}
          <p style={{ fontSize: "0.9375rem", color: "#555555", marginBottom: "1.5rem" }}>
            팀원을 초대하고 함께 시작해보세요.
          </p>

          {/* 버튼 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button
              onClick={handleEnter}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "#F56B23",
                color: "#fff",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "0.9375rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              <LogIn size={18} />
              {workspaceName} 입장하기
            </button>
            <button
              onClick={handleCopyInvite}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "transparent",
                color: copied ? "#2A8C50" : "#555555",
                border: "1px solid #E8E0C8",
                borderRadius: "0.5rem",
                fontSize: "0.9375rem",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "color 0.15s",
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "복사되었습니다" : "팀원 초대 링크 복사"}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
