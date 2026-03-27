import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.password) return null;

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (err) {
          console.error("[AUTH] authorize error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // 로그인 시 user.id를 토큰에 저장
      if (user) {
        token.id = user.id as string;
      }

      // 워크스페이스 조회 조건:
      // - 최초 로그인(user 있음)
      // - 명시적 세션 갱신(trigger === "update")
      // - 토큰에 workspaceId가 없음 (DB에 생겼을 수 있으므로 항상 재조회)
      const needsWorkspaceLookup =
        !!user || trigger === "update" || !token.workspaceId;

      if (needsWorkspaceLookup) {
        const userId = (user?.id ?? token.id) as string;
        if (userId) {
          try {
            const member = await prisma.workspaceMember.findFirst({
              where: { userId },
              orderBy: { joinedAt: "asc" },
            });
            token.role = member?.role ?? "MEMBER";
            token.workspaceId = member?.workspaceId ?? undefined;
          } catch (err) {
            console.error("[AUTH] jwt workspace lookup error:", err);
            // 오류 시 기존 값 유지
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as string) ?? "MEMBER";
        session.user.workspaceId = token.workspaceId as string | undefined;
      }
      return session;
    },
  },
});
