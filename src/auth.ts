import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Twitter from "next-auth/providers/twitter";
import Discord from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { encode, decode } from "next-auth/jwt";
import { randomUUID } from "crypto";

const adapter = PrismaAdapter(prisma);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For credentials sign-in, manually create a database session
      // since Auth.js doesn't do this automatically with the credentials provider
      if (account?.provider === "credentials" && user.id) {
        const sessionToken = randomUUID();
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await adapter.createSession!({
          sessionToken,
          userId: user.id,
          expires,
        });

        // Store token so jwt.encode can return it
        (user as Record<string, unknown>).sessionToken = sessionToken;
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        if (dbUser) {
          session.user.role = dbUser.role;
        }
      }
      return session;
    },
  },
  jwt: {
    encode: async (params) => {
      // For credentials sign-in, return the session token instead of a JWT
      if (params.token?.sub && (params.token as Record<string, unknown>).sessionToken) {
        return (params.token as Record<string, unknown>).sessionToken as string;
      }
      return encode(params);
    },
    decode: async (params) => {
      // If the token looks like a UUID (no dots), it's a session token —
      // return null to force Auth.js to look up the session in the database
      if (params.token && !params.token.includes(".")) {
        return null;
      }
      return decode(params);
    },
  },
});
