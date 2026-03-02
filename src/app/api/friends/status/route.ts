import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const url = new URL(request.url);
  const targetUserId = url.searchParams.get("userId");

  if (!targetUserId) {
    return NextResponse.json(
      { error: "userId query parameter is required" },
      { status: 400 }
    );
  }

  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: targetUserId },
        { requesterId: targetUserId, addresseeId: userId },
      ],
      status: { in: ["PENDING", "ACCEPTED"] },
    },
  });

  if (!friendship) {
    return NextResponse.json({ status: "none" });
  }

  if (friendship.status === "ACCEPTED") {
    return NextResponse.json({
      status: "accepted",
      friendshipId: friendship.id,
    });
  }

  // PENDING
  if (friendship.requesterId === userId) {
    return NextResponse.json({
      status: "pending_sent",
      friendshipId: friendship.id,
    });
  }

  return NextResponse.json({
    status: "pending_received",
    friendshipId: friendship.id,
  });
}
