import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Twitter from "next-auth/providers/twitter";
import Discord from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { authorizeCredentials } from "@/lib/auth-utils";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    newUser: "/settings",
    error: "/login",
  },
  providers: [
    Twitter,
    Discord,
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id || trigger === "update") {
        const userId = (user?.id || token.id) as string;
        token.id = userId;
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, name: true, email: true, avatarUrl: true, theme: true, showOnlineStatus: true, notificationSound: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.avatarUrl = dbUser.avatarUrl;
          token.theme = dbUser.theme;
          token.showOnlineStatus = dbUser.showOnlineStatus;
          token.notificationSound = dbUser.notificationSound;
          // Ensure name/email are on the token for OAuth users
          if (dbUser.name) token.name = dbUser.name;
          if (dbUser.email) token.email = dbUser.email;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "DOMME" | "SUB";
        session.user.avatarUrl = (token.avatarUrl as string) ?? null;
        session.user.theme = (token.theme as "LIGHT" | "DARK" | "SYSTEM") ?? "SYSTEM";
        session.user.showOnlineStatus = (token.showOnlineStatus as boolean) ?? true;
        session.user.notificationSound = (token.notificationSound as boolean) ?? true;
        // Fallback display: use token name, email, or "User"
        if (!session.user.name && token.name) {
          session.user.name = token.name;
        }
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Twitter may not provide an email — allow sign-in regardless
      if (account?.provider === "twitter" && !user.email) {
        return true;
      }
      return true;
    },
  },
});
