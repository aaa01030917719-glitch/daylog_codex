import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";

const { auth } = NextAuth(authConfig);

// 인증 없이 접근 가능한 경로
const PUBLIC_PATHS = ["/login", "/register"];

// 로그인 여부 관계없이 항상 통과 (초대 링크 등)
const ALWAYS_PUBLIC_PATHS = ["/invite"];

// 워크스페이스 없어도 접근 가능한 경로 (로그인은 필요)
const NO_WORKSPACE_PATHS = ["/onboarding"];

export default auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // 로그인 상태와 무관하게 항상 통과 (초대 링크)
  if (ALWAYS_PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isNoWorkspace = NO_WORKSPACE_PATHS.some((p) => pathname.startsWith(p));

  // 비로그인 + 공개 경로 → 통과
  if (isPublic) {
    // 이미 로그인된 상태면 대시보드로
    if (session) {
      if (!session.user?.workspaceId) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // 비로그인 + 비공개 경로 → 로그인으로
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 로그인 + 워크스페이스 없음 + onboarding은 통과
  if (isNoWorkspace) {
    return NextResponse.next();
  }

  // 로그인 + 워크스페이스 없음 + 일반 경로 → 온보딩으로
  if (!session.user?.workspaceId) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sw.js).*)"],
};
