import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";

// Edge Runtime 호환: authConfig만 사용 (Node.js 모듈 없음)
const { auth } = NextAuth(authConfig);

export default auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isOnboarding = pathname.startsWith("/onboarding");

  // 비로그인 → 로그인 페이지로
  if (!session && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 로그인 상태에서 인증 페이지 접근
  if (session && isAuthPage) {
    if (!session.user?.workspaceId) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  // 로그인 상태인데 워크스페이스 없음 → 온보딩으로
  if (session && !session.user?.workspaceId && !isOnboarding) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
