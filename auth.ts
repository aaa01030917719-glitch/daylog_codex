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
      if (user) {
        token.id = user.id as string;
        token.workspaceLoaded = false;
      }

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
