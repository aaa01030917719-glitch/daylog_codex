"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CheckCircle2 } from "lucide-react";

interface Props {
  open: boolean;
  name: string;
  hasWorkspace?: boolean;
}

export function RegisterSuccessModal({ open, name, hasWorkspace = false }: Props) {
  function handleStart() {
    window.location.href = hasWorkspace ? "/" : "/onboarding";
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
            maxWidth: "22rem",
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
              background: "#FEF0E8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}
          >
            <CheckCircle2 size={48} style={{ color: "#F56B23" }} />
          </div>

          {/* 제목 */}
          <h2
            style={{
              fontFamily: "Noto Serif KR, serif",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#0D0D0D",
              marginBottom: "0.5rem",
            }}
          >
            회원가입이 완료되었습니다!
          </h2>

          {/* 본문 */}
          <p style={{ fontSize: "0.9375rem", color: "#555555", marginBottom: "1.75rem", lineHeight: 1.6 }}>
            Daylog에 오신 것을 환영합니다, <strong style={{ color: "#0D0D0D" }}>{name}</strong>님 👋
          </p>

          {/* 버튼 */}
          <button
            onClick={handleStart}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "#F56B23",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            시작하기
          </button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
