"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        return;
      }

      // 쿠키 반영 보장을 위해 하드 내비게이션 사용
      window.location.href = "/";
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-light)] px-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-bold text-[var(--text-title)]">
            daylog
          </h1>
          <p className="mt-2 text-sm text-[var(--text-sub)]">
            팀 업무 관리 플랫폼
          </p>
        </div>

        {/* 카드 */}
        <div className="rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">
          <h2 className="mb-6 font-serif text-xl font-semibold text-[var(--text-title)]">
            로그인
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "로그인 중..." : "로그인"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text-sub)]">
            계정이 없으신가요?{" "}
            <Link
              href="/register"
              className="font-medium text-[var(--accent)] hover:text-[var(--accent-dark)]"
            >
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
