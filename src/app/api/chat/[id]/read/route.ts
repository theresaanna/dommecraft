import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAblyRest } from "@/lib/ably";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: conversationId } = await params;
  const userId = session.user.id;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { participant1Id: true, participant2Id: true },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  if (
    conversation.participant1Id !== userId &&
    conversation.participant2Id !== userId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if user has read receipts enabled
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { showReadReceipts: true },
  });

  if (!user?.showReadReceipts) {
    return NextResponse.json({ readAt: null });
  }

  const now = new Date();
  const isParticipant1 = conversation.participant1Id === userId;

  await prisma.conversation.update({
    where: { id: conversationId },
    data: isParticipant1
      ? { participant1LastReadAt: now }
      : { participant2LastReadAt: now },
  });

  const readAt = now.toISOString();

  try {
    const rest = getAblyRest();
    const channel = rest.channels.get(`chat:${conversationId}`);
    await channel.publish("read", { userId, readAt });
  } catch {
    // Non-fatal: read status is persisted, real-time delivery failed
  }

  return NextResponse.json({ readAt });
}
