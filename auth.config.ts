import type { NextAuthConfig } from "next-auth";

// Edge Runtime 호환 config — Node.js 모듈(prisma, bcrypt) 없음
// 미들웨어와 공유되므로 반드시 Edge-safe 코드만 작성
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      // JWT가 존재하면 인증된 것으로 판단 (세부 리다이렉트는 미들웨어에서)
      return !!auth;
    },
  },
};
