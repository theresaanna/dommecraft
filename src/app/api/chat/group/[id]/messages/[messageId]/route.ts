import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAblyRest } from "@/lib/ably";
import { isGroupMember } from "@/lib/group-chat-access";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, messageId } = await params;
  const userId = session.user.id;

  const group = await prisma.groupConversation.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!group) {
    return NextResponse.json(
      { error: "Group not found" },
      { status: 404 }
    );
  }

  const { isMember } = await isGroupMember(id, userId);
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: { id: true, groupConversationId: true, senderId: true },
  });

  if (!message || message.groupConversationId !== id) {
    return NextResponse.json(
      { error: "Message not found" },
      { status: 404 }
    );
  }

  if (message.senderId !== userId) {
    return NextResponse.json(
      { error: "You can only edit your own messages" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const rawContent = body.content;

  if (!rawContent || typeof rawContent !== "string" || rawContent.trim().length === 0) {
    return NextResponse.json(
      { error: "Message content is required" },
      { status: 400 }
    );
  }

  const content = rawContent.trim();

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { content, editedAt: new Date() },
    select: {
      id: true,
      senderId: true,
      content: true,
      mediaUrl: true,
      mediaMimeType: true,
      mediaFileSize: true,
      editedAt: true,
      createdAt: true,
      reactions: { select: { emoji: true, userId: true } },
    },
  });

  const messageData = {
    ...updated,
    editedAt: updated.editedAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  };

  try {
    const rest = getAblyRest();
    const channel = rest.channels.get(`group:${id}`);
    await channel.publish("edit", messageData);
  } catch {
    // Non-fatal: edit is persisted, real-time delivery failed
  }

  return NextResponse.json(messageData);
}
