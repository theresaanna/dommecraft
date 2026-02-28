import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function authorizeCredentials(
  credentials: Partial<Record<string, unknown>>
) {
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
}
