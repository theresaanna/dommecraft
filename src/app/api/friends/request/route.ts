import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json();
  const { addresseeId } = body;

  if (!addresseeId || typeof addresseeId !== "string") {
    return NextResponse.json(
      { error: "addresseeId is required" },
      { status: 400 }
    );
  }

  if (addresseeId === userId) {
    return NextResponse.json(
      { error: "Cannot send a friend request to yourself" },
      { status: 400 }
    );
  }

  // Check for existing friendship in either direction
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId },
        { requesterId: addresseeId, addresseeId: userId },
      ],
      status: { in: ["PENDING", "ACCEPTED"] },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Friend request already exists" },
      { status: 409 }
    );
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId: userId, addresseeId },
  });

  const senderName = session.user.name || "Someone";
  await createNotification({
    userId: addresseeId,
    type: "FRIEND_REQUEST",
    message: `${senderName} sent you a friend request`,
    linkUrl: `/users/${userId}`,
  });

  return NextResponse.json(
    { id: friendship.id, status: friendship.status },
    { status: 201 }
  );
}
