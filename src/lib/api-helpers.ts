import { prisma } from "@/lib/prisma";

export async function verifySubOwnership(
  subId: string,
  userId: string
): Promise<boolean> {
  const sub = await prisma.subProfile.findUnique({
    where: { id: subId, userId },
    select: { id: true },
  });
  return !!sub;
}
