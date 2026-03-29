"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useParams } from "next/navigation";
import { Building2, LogIn } from "lucide-react";

interface WorkspaceInfo {
  workspaceName: string;
  ownerName: string | null;
}

export default function InvitePage() {
  const params = useParams();
  const code = params.code as string;
  const { data: session, status, update } = useSession();

  const [info, setInfo] = useState<WorkspaceInfo | null>(null);
  const [validating, setValidating] = useState(true);
  const [invalid, setInvalid] = useState(false);

  // 인라인 회원가입 폼 상태
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    fetch("/api/workspace/validate-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: code }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setInfo({ workspaceName: data.workspaceName, ownerName: data.ownerName });
        } else {
          setInvalid(true);
        }
      })
      .catch(() => setInvalid(true))
      .finally(() => setValidating(false));
  }, [code]);

  // 이미 로그인된 경우: 워크스페이스 참여 처리
  async function joinWorkspace() {
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/workspace/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      });
      if (res.ok) {
        await update();
        window.location.href = "/";
      } else {
        const data = await res.json();
        setFormError(data.error ?? "참여 중 오류가 발생했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // 신규 가입 + 워크스페이스 참여
  async function handleRegisterAndJoin(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) { setFormError("이름을 입력해주세요."); return; }
    if (!email.trim()) { setFormError("이메일을 입력해주세요."); return; }
    if (password.length < 8) { setFormError("비밀번호는 8자 이상이어야 합니다."); return; }
    if (password !== passwordConfirm) { setFormError("비밀번호가 일치하지 않습니다."); return; }

    setSubmitting(true);
    try {
      // 1. 회원가입
      const registerRes = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const registerData = await registerRes.json();
      if (!registerRes.ok) {
        setFormError(registerData.error ?? "회원가입 중 오류가 발생했습니다.");
        return;
      }

      // 2. 자동 로그인
      const loginResult = await signIn("credentials", { email: email.trim(), password, redirect: false });
      if (loginResult?.error) {
        setFormError("자동 로그인에 실패했습니다. 로그인 후 다시 시도해주세요.");
        return;
      }

      // 3. 워크스페이스 참여
      const joinRes = await fetch("/api/workspace/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      });
      if (!joinRes.ok) {
        const joinData = await joinRes.json();
        setFormError(joinData.error ?? "워크스페이스 참여 중 오류가 발생했습니다.");
        return;
      }

      // 4. 세션 갱신 후 대시보드로
      await update();
      setJoined(true);
      // 짧은 딜레이 후 이동 (성공 메시지 표시)
      setTimeout(() => { window.location.href = "/"; }, 1500);
    } finally {
      setSubmitting(false);
    }
  }

  const alreadyHasWorkspace = !!(session?.user as { workspaceId?: string } | undefined)?.workspaceId;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #E8E0C8",
    borderRadius: "7px",
    padding: "9px 12px",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
    color: "#0D0D0D",
    background: "#fff",
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#FAF7EE",
      padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: "26rem" }}>
        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "2rem", fontWeight: 700, color: "#0D0D0D" }}>
            daylog
          </h1>
        </div>

        <div style={{
          background: "#fff",
          border: "1px solid #E8E0C8",
          borderRadius: "1rem",
          padding: "2rem",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}>
          {/* 검증 중 */}
          {validating && (
            <p style={{ color: "#999", fontSize: "0.9375rem", textAlign: "center" }}>초대 링크 확인 중...</p>
          )}

          {/* 유효하지 않은 토큰 */}
          {!validating && invalid && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⚠️</p>
              <h2 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1.125rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "0.5rem" }}>
                유효하지 않은 초대 링크
              </h2>
              <p style={{ fontSize: "0.875rem", color: "#999", marginBottom: "1.5rem" }}>
                초대 링크가 만료되었거나 유효하지 않습니다.<br />관리자에게 새 초대 링크를 요청하세요.
              </p>
              <button
                onClick={() => { window.location.href = "/login"; }}
                style={{
                  width: "100%", padding: "0.75rem",
                  background: "#F56B23", color: "#fff", border: "none",
                  borderRadius: "0.5rem", fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer",
                }}
              >
                로그인 페이지로 이동
              </button>
            </div>
          )}

          {/* 유효한 토큰 */}
          {!validating && !invalid && info && (
            <>
              {/* 워크스페이스 헤더 */}
              <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                <div style={{
                  width: "4rem", height: "4rem", borderRadius: "50%",
                  background: "#FEF0E8", display: "flex", alignItems: "center",
                  justifyContent: "center", margin: "0 auto 1rem",
                }}>
                  <Building2 size={32} style={{ color: "#F56B23" }} />
                </div>
                <h2 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1.125rem", fontWeight: 700, color: "#0D0D0D", marginBottom: "0.375rem" }}>
                  {info.workspaceName} 팀에 초대되었습니다
                </h2>
                {info.ownerName && (
                  <p style={{ fontSize: "0.8125rem", color: "#999" }}>
                    {info.ownerName}님이 초대했습니다
                  </p>
                )}
              </div>

              {/* 가입 성공 상태 */}
              {joined && (
                <div style={{ textAlign: "center", padding: "1rem 0" }}>
                  <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>✅</p>
                  <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#2A8C50" }}>
                    합류 완료! 대시보드로 이동합니다...
                  </p>
                </div>
              )}

              {/* 로그인 + 워크스페이스 이미 있음 */}
              {!joined && status === "authenticated" && alreadyHasWorkspace && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "0.875rem", color: "#555", marginBottom: "1.25rem" }}>
                    이미 가입된 워크스페이스입니다. 대시보드로 이동하세요.
                  </p>
                  <button
                    onClick={() => { window.location.href = "/"; }}
                    style={{
                      width: "100%", padding: "0.75rem",
                      background: "#F56B23", color: "#fff", border: "none",
                      borderRadius: "0.5rem", fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                    }}
                  >
                    <LogIn size={18} />
                    대시보드로 이동
                  </button>
                </div>
              )}

              {/* 로그인 + 워크스페이스 없음 → 바로 참여 */}
              {!joined && status === "authenticated" && !alreadyHasWorkspace && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "0.875rem", color: "#555", marginBottom: "1.25rem" }}>
                    아래 버튼을 클릭하면 바로 팀에 합류합니다.
                  </p>
                  {formError && (
                    <p style={{ fontSize: "0.875rem", color: "#D93025", marginBottom: "0.75rem" }}>{formError}</p>
                  )}
                  <button
                    onClick={joinWorkspace}
                    disabled={submitting}
                    style={{
                      width: "100%", padding: "0.75rem",
                      background: "#F56B23", color: "#fff", border: "none",
                      borderRadius: "0.5rem", fontSize: "0.9375rem", fontWeight: 600,
                      cursor: submitting ? "not-allowed" : "pointer",
                      opacity: submitting ? 0.7 : 1,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                    }}
                  >
                    <LogIn size={18} />
                    {submitting ? "처리 중..." : `${info.workspaceName} 참여하기`}
                  </button>
                </div>
              )}

              {/* 비로그인 → 인라인 회원가입 폼 */}
              {!joined && status === "unauthenticated" && (
                <form onSubmit={handleRegisterAndJoin} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                  <p style={{ fontSize: "0.8125rem", color: "#999", marginBottom: "0.25rem", textAlign: "center" }}>
                    아래 정보를 입력하면 팀에 바로 합류합니다
                  </p>

                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#2D2D2D", marginBottom: "4px" }}>
                      이름 <span style={{ color: "#F56B23" }}>*</span>
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="홍길동"
                      required
                      autoFocus
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
                      onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#2D2D2D", marginBottom: "4px" }}>
                      이메일 <span style={{ color: "#F56B23" }}>*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hello@example.com"
                      required
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
                      onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#2D2D2D", marginBottom: "4px" }}>
                      비밀번호 <span style={{ color: "#F56B23" }}>*</span>
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="8자 이상 입력"
                      required
                      minLength={8}
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
                      onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#2D2D2D", marginBottom: "4px" }}>
                      비밀번호 확인 <span style={{ color: "#F56B23" }}>*</span>
                    </label>
                    <input
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="비밀번호 재입력"
                      required
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
                      onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
                    />
                  </div>

                  {formError && (
                    <p style={{ fontSize: "13px", color: "#D93025" }}>{formError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      width: "100%", padding: "0.75rem",
                      background: "#F56B23", color: "#fff", border: "none",
                      borderRadius: "0.5rem", fontSize: "0.9375rem", fontWeight: 600,
                      cursor: submitting ? "not-allowed" : "pointer",
                      opacity: submitting ? 0.7 : 1,
                      marginTop: "0.25rem",
                    }}
                  >
                    {submitting ? "처리 중..." : "가입하고 팀 합류하기"}
                  </button>

                  <p style={{ textAlign: "center", fontSize: "0.8125rem", color: "#999" }}>
                    이미 계정이 있으신가요?{" "}
                    <span
                      style={{ color: "#F56B23", cursor: "pointer", fontWeight: 500 }}
                      onClick={() => { window.location.href = `/login?inviteCode=${encodeURIComponent(code)}`; }}
                    >
                      로그인
                    </span>
                  </p>
                </form>
              )}

              {/* 세션 로딩 중 */}
              {!joined && status === "loading" && (
                <p style={{ textAlign: "center", color: "#999", fontSize: "0.9375rem" }}>로딩 중...</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
