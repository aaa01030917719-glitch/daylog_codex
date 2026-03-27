import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Credentials-only 앱에서는 PrismaAdapter 불필요 (JWT 전략과 충돌)
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
  },
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
      // 최초 로그인 시 user 객체가 있음
      if (user) {
        token.id = user.id as string;
        token.workspaceLoaded = false;
      }

      // 워크스페이스 조회: 최초 로그인 또는 세션 갱신 요청 시에만
      if (user || trigger === "update" || !token.workspaceLoaded) {
        const userId = (user?.id ?? token.id) as string;
        if (userId) {
          try {
            const member = await prisma.workspaceMember.findFirst({
              where: { userId },
              orderBy: { joinedAt: "asc" },
            });
            token.role = member?.role ?? "MEMBER";
            token.workspaceId = member?.workspaceId;
            token.workspaceLoaded = true;
          } catch (err) {
            console.error("[AUTH] jwt workspace lookup error:", err);
            token.role = token.role ?? "MEMBER";
            token.workspaceLoaded = true;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.workspaceId = token.workspaceId as string | undefined;
      }
      return session;
    },
  },
});
