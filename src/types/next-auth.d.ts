import type { UserRole, Theme } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      avatarUrl?: string | null;
      theme: Theme;
    } & DefaultSession["user"];
  }
}
