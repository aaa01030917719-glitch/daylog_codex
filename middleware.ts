import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  })

  const { pathname } = request.nextUrl

  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register')

  const isOnboarding = pathname.startsWith('/onboarding')

  // 비로그인 → 로그인 페이지로
  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 로그인 상태에서 인증 페이지 접근 → 대시보드로
  if (token && isAuthPage) {
    if (!token.workspaceId) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 로그인 상태인데 워크스페이스 없음 → 온보딩으로
  if (token && !token.workspaceId && !isOnboarding) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
