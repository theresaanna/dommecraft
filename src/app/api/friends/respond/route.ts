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
  const { friendshipId, action } = body;

  if (!friendshipId || typeof friendshipId !== "string") {
    return NextResponse.json(
      { error: "friendshipId is required" },
      { status: 400 }
    );
  }

  if (action !== "accept" && action !== "reject") {
    return NextResponse.json(
      { error: "action must be 'accept' or 'reject'" },
      { status: 400 }
    );
  }

  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
  });

  if (!friendship || friendship.addresseeId !== userId) {
    return NextResponse.json(
      { error: "Friend request not found" },
      { status: 404 }
    );
  }

  if (friendship.status !== "PENDING") {
    return NextResponse.json(
      { error: "Friend request already responded to" },
      { status: 409 }
    );
  }

  const newStatus = action === "accept" ? "ACCEPTED" : "REJECTED";

  await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: newStatus },
  });

  if (action === "accept") {
    const responderName = session.user.name || "Someone";
    await createNotification({
      userId: friendship.requesterId,
      type: "FRIEND_ACCEPTED",
      message: `${responderName} accepted your friend request`,
      linkUrl: `/users/${userId}`,
    });
  }

  return NextResponse.json({ status: newStatus });
}
