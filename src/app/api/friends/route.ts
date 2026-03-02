import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: { select: { id: true, name: true, avatarUrl: true } },
      addressee: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const friends = friendships.map((f) => {
    const other = f.requesterId === userId ? f.addressee : f.requester;
    return {
      friendshipId: f.id,
      user: { id: other.id, name: other.name, avatarUrl: other.avatarUrl },
    };
  });

  return NextResponse.json(friends);
}
