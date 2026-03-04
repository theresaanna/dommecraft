import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Find all SubProfiles linking this user to another user
  const linkedProfiles = await prisma.subProfile.findMany({
    where: {
      OR: [
        { userId, linkedUserId: { not: null } },
        { linkedUserId: userId },
      ],
    },
    select: {
      userId: true,
      linkedUserId: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
      linkedUser: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  // Extract the "other" user from each linked profile
  const contactMap = new Map<
    string,
    { id: string; name: string | null; avatarUrl: string | null }
  >();

  for (const profile of linkedProfiles) {
    if (profile.userId === userId && profile.linkedUser) {
      contactMap.set(profile.linkedUser.id, profile.linkedUser);
    } else if (profile.linkedUserId === userId && profile.user) {
      contactMap.set(profile.user.id, profile.user);
    }
  }

  // Add accepted friends
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: {
      requesterId: true,
      addresseeId: true,
      requester: { select: { id: true, name: true, avatarUrl: true } },
      addressee: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  for (const friendship of friendships) {
    const other =
      friendship.requesterId === userId
        ? friendship.addressee
        : friendship.requester;
    if (!contactMap.has(other.id)) {
      contactMap.set(other.id, other);
    }
  }

  return NextResponse.json(Array.from(contactMap.values()));
}
