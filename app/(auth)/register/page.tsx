"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RegisterSuccessModal } from "@/components/modals/RegisterSuccessModal";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [registeredName, setRegisteredName] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "회원가입 중 오류가 발생했습니다.");
        return;
      }

      // 자동 로그인 후 모달 표시
      await signIn("credentials", { email, password, redirect: false });
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
            <h1 className="font-serif text-3xl font-bold text-[var(--text-title)]">
              daylog
            </h1>
            <p className="mt-2 text-sm text-[var(--text-sub)]">
              팀 업무 관리 플랫폼
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
                  onChange={(e) => setName(e.target.value)}
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
                  onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "처리 중..." : "회원가입"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--text-sub)]">
              이미 계정이 있으신가요?{" "}
              <Link
                href="/login"
                className="font-medium text-[var(--accent)] hover:text-[var(--accent-dark)]"
              >
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
