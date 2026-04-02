"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RegisterSuccessModal } from "@/components/modals/RegisterSuccessModal";
import { createInvitePath, normalizeInviteCode } from "@/lib/utils";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [registeredName, setRegisteredName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setInviteCode(normalizeInviteCode(query.get("inviteCode") ?? ""));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "회원가입 중 오류가 발생했습니다.");
        return;
      }

      await signIn("credentials", { email, password, redirect: false });

      if (inviteCode) {
        window.location.href = createInvitePath(inviteCode);
        return;
      }

      setRegisteredName(name || email);
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <RegisterSuccessModal open={showModal} name={registeredName} />

      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-light)] px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="font-serif text-3xl font-bold text-[var(--text-title)]">daylog</h1>
            <p className="mt-2 text-sm text-[var(--text-sub)]">
              {inviteCode
                ? "초대 링크를 통해 워크스페이스에 참여합니다."
                : "업무 관리를 시작해 보세요."}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">
            <h2 className="mb-6 font-serif text-xl font-semibold text-[var(--text-title)]">
              회원가입
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="홍길동"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="hello@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="8자 이상 입력"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "처리 중..." : inviteCode ? "회원가입 후 참여하기" : "회원가입"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--text-sub)]">
              이미 계정이 있으신가요?{" "}
              <Link
                href={inviteCode ? `/login?inviteCode=${encodeURIComponent(inviteCode)}` : "/login"}
                className="font-medium text-[var(--accent)] hover:text-[var(--accent-dark)]"
              >
                로그인
              </Link>
            </p>

            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-light)] px-4 py-3 text-center">
              <p className="text-xs text-[var(--text-sub)]">
                {inviteCode
                  ? "로그인 또는 회원가입 후 바로 참여할 수 있습니다."
                  : "초대 링크가 있다면 전달받은 링크를 열어 바로 참여해 주세요."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
