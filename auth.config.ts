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
      return !!auth;
    },
    // JWT token → session.user 매핑 (DB 접근 없음, Edge-safe)
    // 미들웨어에서 req.auth.user.workspaceId를 읽으려면 반드시 필요
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as string) ?? "MEMBER";
        session.user.workspaceId = token.workspaceId as string | undefined;
      }
      return session;
    },
  },
};
