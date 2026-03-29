"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Building2, Users, ChevronRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { WorkspaceSuccessModal } from "@/components/modals/WorkspaceSuccessModal";

type Mode = "select" | "create" | "join";

interface CreatedWorkspace {
  name: string;
  inviteCode: string;
}

// 단계 인디케이터 (select/create/join 모드에서 현재 단계 표시)
function StepIndicator({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "워크스페이스" },
    { n: 2, label: "팀원 초대" },
    { n: 3, label: "시작!" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0", marginBottom: "1.75rem" }}>
      {steps.map((step, idx) => (
        <div key={step.n} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
            <div
              style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8125rem",
                fontWeight: 700,
                background: step.n < currentStep ? "#2A8C50" : step.n === currentStep ? "#F56B23" : "#E8E0C8",
                color: step.n <= currentStep ? "#fff" : "#999",
                transition: "all 0.2s",
              }}
            >
              {step.n < currentStep ? "✓" : step.n}
            </div>
            <span style={{ fontSize: "0.6875rem", color: step.n === currentStep ? "#F56B23" : "#999", fontWeight: step.n === currentStep ? 600 : 400 }}>
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div style={{ width: "3rem", height: "2px", background: step.n < currentStep ? "#2A8C50" : "#E8E0C8", marginBottom: "1rem", transition: "background 0.2s" }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const alreadyHasWorkspace = !!(session?.user as { workspaceId?: string } | undefined)?.workspaceId;

  const [mode, setMode] = useState<Mode>("select");
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedWorkspace | null>(null);

  async function handleCreate() {
    if (!workspaceName.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "워크스페이스 생성 중 오류가 발생했습니다.");
        return;
      }
      // JWT 갱신 후 모달 표시
      await update();
      if (data.alreadyExists) {
        window.location.href = "/";
        return;
      }
      setCreated({ name: data.name ?? workspaceName.trim(), inviteCode: data.inviteCode ?? "" });
    } catch (err) {
      console.error("[ONBOARDING] create error:", err);
      setError("워크스페이스 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "참여 중 오류가 발생했습니다.");
        return;
      }
      await update();
      window.location.href = "/";
    } catch (err) {
      console.error("[ONBOARDING] join error:", err);
      setError("워크스페이스 참여 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {created && (
        <WorkspaceSuccessModal
          open={true}
          workspaceName={created.name}
          inviteCode={created.inviteCode}
        />
      )}

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAF7EE",
          padding: "1.5rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: "28rem" }}>
          {/* 로고 */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h1
              style={{
                fontFamily: "Noto Serif KR, serif",
                fontSize: "2rem",
                fontWeight: 700,
                color: "#0D0D0D",
              }}
            >
              daylog
            </h1>
            <p style={{ marginTop: "0.375rem", fontSize: "0.875rem", color: "#999" }}>
              시작하기 전에 워크스페이스를 설정해주세요.
            </p>
          </div>

          {/* 이미 워크스페이스가 있는 경우 안내 */}
          {alreadyHasWorkspace && (
            <div
              style={{
                background: "#fff",
                border: "1px solid #BBF7D0",
                borderRadius: "1rem",
                padding: "2rem",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                textAlign: "center",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                <CheckCircle2 size={48} style={{ color: "#2A8C50" }} />
              </div>
              <h2
                style={{
                  fontFamily: "Noto Serif KR, serif",
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "#0D0D0D",
                  marginBottom: "0.5rem",
                }}
              >
                이미 워크스페이스가 있어요!
              </h2>
              <p style={{ fontSize: "0.875rem", color: "#999", marginBottom: "1.5rem" }}>
                지금 바로 팀과 함께 시작할 수 있습니다.
              </p>
              <button
                onClick={() => { window.location.href = "/"; }}
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
                }}
              >
                대시보드로 이동
              </button>
            </div>
          )}

          {!alreadyHasWorkspace && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #E8E0C8",
              borderRadius: "1rem",
              padding: "2rem",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            }}
          >
            <StepIndicator currentStep={mode === "select" ? 1 : 2} />

            {/* 모드 선택 */}
            {mode === "select" && (
              <div>
                <h2
                  style={{
                    fontFamily: "Noto Serif KR, serif",
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    color: "#0D0D0D",
                    marginBottom: "1.25rem",
                  }}
                >
                  워크스페이스 설정
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <button
                    onClick={() => setMode("create")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      padding: "1.125rem",
                      border: "1.5px solid #E8E0C8",
                      borderRadius: "0.75rem",
                      background: "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "border-color 0.15s, background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#F56B23";
                      e.currentTarget.style.background = "#FEF0E8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#E8E0C8";
                      e.currentTarget.style.background = "#fff";
                    }}
                  >
                    <div
                      style={{
                        width: "2.5rem",
                        height: "2.5rem",
                        borderRadius: "0.625rem",
                        background: "#FEF0E8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Building2 size={20} style={{ color: "#F56B23" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p
                        style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "0.125rem" }}
                      >
                        새 워크스페이스 만들기
                      </p>
                      <p style={{ fontSize: "0.8125rem", color: "#999" }}>
                        팀을 위한 새 공간을 생성하고 구성원을 초대하세요.
                      </p>
                    </div>
                    <ChevronRight size={18} style={{ color: "#999", flexShrink: 0 }} />
                  </button>

                  <button
                    onClick={() => setMode("join")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      padding: "1.125rem",
                      border: "1.5px solid #E8E0C8",
                      borderRadius: "0.75rem",
                      background: "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "border-color 0.15s, background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#3B5BDB";
                      e.currentTarget.style.background = "#EEF3FC";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#E8E0C8";
                      e.currentTarget.style.background = "#fff";
                    }}
                  >
                    <div
                      style={{
                        width: "2.5rem",
                        height: "2.5rem",
                        borderRadius: "0.625rem",
                        background: "#EEF3FC",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Users size={20} style={{ color: "#3B5BDB" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p
                        style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "0.125rem" }}
                      >
                        초대 코드로 참여하기
                      </p>
                      <p style={{ fontSize: "0.8125rem", color: "#999" }}>
                        관리자로부터 받은 초대 코드를 입력하세요.
                      </p>
                    </div>
                    <ChevronRight size={18} style={{ color: "#999", flexShrink: 0 }} />
                  </button>
                </div>
              </div>
            )}

            {/* 워크스페이스 생성 */}
            {mode === "create" && (
              <div>
                <button
                  onClick={() => { setMode("select"); setError(""); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#999",
                    fontSize: "0.875rem",
                    marginBottom: "1.25rem",
                    padding: 0,
                  }}
                >
                  <ArrowLeft size={16} />
                  뒤로
                </button>

                <h2
                  style={{
                    fontFamily: "Noto Serif KR, serif",
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    color: "#0D0D0D",
                    marginBottom: "1.25rem",
                  }}
                >
                  새 워크스페이스 만들기
                </h2>

                <div style={{ marginBottom: "1rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#555",
                      marginBottom: "0.375rem",
                    }}
                  >
                    워크스페이스 이름 <span style={{ color: "#F56B23" }}>*</span>
                  </label>
                  <input
                    autoFocus
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !loading && handleCreate()}
                    placeholder="팀 이름이나 회사 이름을 입력하세요"
                    style={{
                      width: "100%",
                      border: "1px solid #E8E0C8",
                      borderRadius: "0.5rem",
                      padding: "0.625rem 0.75rem",
                      fontSize: "0.9375rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
                    onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
                  />
                </div>

                {error && (
                  <p style={{ fontSize: "0.875rem", color: "#D93025", marginBottom: "0.75rem" }}>
                    {error}
                  </p>
                )}

                <button
                  onClick={handleCreate}
                  disabled={loading || !workspaceName.trim()}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    background: "#F56B23",
                    color: "#fff",
                    border: "none",
                    borderRadius: "0.5rem",
                    fontSize: "0.9375rem",
                    fontWeight: 600,
                    cursor: loading || !workspaceName.trim() ? "not-allowed" : "pointer",
                    opacity: loading || !workspaceName.trim() ? 0.6 : 1,
                  }}
                >
                  {loading ? "생성 중..." : "워크스페이스 만들기"}
                </button>
              </div>
            )}

            {/* 초대 코드 참여 */}
            {mode === "join" && (
              <div>
                <button
                  onClick={() => { setMode("select"); setError(""); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#999",
                    fontSize: "0.875rem",
                    marginBottom: "1.25rem",
                    padding: 0,
                  }}
                >
                  <ArrowLeft size={16} />
                  뒤로
                </button>

                <h2
                  style={{
                    fontFamily: "Noto Serif KR, serif",
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    color: "#0D0D0D",
                    marginBottom: "1.25rem",
                  }}
                >
                  초대 코드로 참여하기
                </h2>

                <div style={{ marginBottom: "1rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#555",
                      marginBottom: "0.375rem",
                    }}
                  >
                    초대 코드 <span style={{ color: "#F56B23" }}>*</span>
                  </label>
                  <input
                    autoFocus
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !loading && handleJoin()}
                    placeholder="초대 코드를 입력하세요"
                    style={{
                      width: "100%",
                      border: "1px solid #E8E0C8",
                      borderRadius: "0.5rem",
                      padding: "0.625rem 0.75rem",
                      fontSize: "0.9375rem",
                      outline: "none",
                      boxSizing: "border-box",
                      fontFamily: "monospace",
                      letterSpacing: "0.05em",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#3B5BDB")}
                    onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
                  />
                  <p style={{ fontSize: "0.8125rem", color: "#999", marginTop: "0.375rem" }}>
                    관리자 페이지의 워크스페이스 설정에서 초대 코드를 확인하세요.
                  </p>
                </div>

                {error && (
                  <p style={{ fontSize: "0.875rem", color: "#D93025", marginBottom: "0.75rem" }}>
                    {error}
                  </p>
                )}

                <button
                  onClick={handleJoin}
                  disabled={loading || !inviteCode.trim()}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    background: "#3B5BDB",
                    color: "#fff",
                    border: "none",
                    borderRadius: "0.5rem",
                    fontSize: "0.9375rem",
                    fontWeight: 600,
                    cursor: loading || !inviteCode.trim() ? "not-allowed" : "pointer",
                    opacity: loading || !inviteCode.trim() ? 0.6 : 1,
                  }}
                >
                  {loading ? "참여 중..." : "워크스페이스 참여하기"}
                </button>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </>
  );
}
