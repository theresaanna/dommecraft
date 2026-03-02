import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAblyRest } from "@/lib/ably";
import { isGroupMember } from "@/lib/group-chat-access";

export async function POST(
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

  const body = await request.json();
  const { emoji } = body;

  if (!emoji || typeof emoji !== "string") {
    return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
  }

  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: { id: true, groupConversationId: true },
  });

  if (!message || message.groupConversationId !== id) {
    return NextResponse.json(
      { error: "Message not found" },
      { status: 404 }
    );
  }

  const existing = await prisma.messageReaction.findUnique({
    where: {
      messageId_userId_emoji: { messageId, userId, emoji },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Already reacted" }, { status: 409 });
  }

  const reaction = await prisma.messageReaction.create({
    data: { messageId, userId, emoji },
  });

  try {
    const rest = getAblyRest();
    const channel = rest.channels.get(`group:${id}`);
    await channel.publish("reaction", {
      messageId,
      emoji,
      userId,
      action: "add",
    });
  } catch {
    // Non-fatal: reaction is persisted, real-time delivery failed
  }

  return NextResponse.json(reaction, { status: 201 });
}

export async function DELETE(
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

  const body = await request.json();
  const { emoji } = body;

  if (!emoji || typeof emoji !== "string") {
    return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
  }

  const existing = await prisma.messageReaction.findUnique({
    where: {
      messageId_userId_emoji: { messageId, userId, emoji },
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Reaction not found" },
      { status: 404 }
    );
  }

  await prisma.messageReaction.delete({
    where: {
      messageId_userId_emoji: { messageId, userId, emoji },
    },
  });

  try {
    const rest = getAblyRest();
    const channel = rest.channels.get(`group:${id}`);
    await channel.publish("reaction", {
      messageId,
      emoji,
      userId,
      action: "remove",
    });
  } catch {
    // Non-fatal: reaction is deleted, real-time delivery failed
  }

  return NextResponse.json({ success: true });
}
