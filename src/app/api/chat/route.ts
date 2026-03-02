import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canDirectChat } from "@/lib/chat-access";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ participant1Id: userId }, { participant2Id: userId }],
    },
    include: {
      participant1: { select: { id: true, name: true, avatarUrl: true } },
      participant2: { select: { id: true, name: true, avatarUrl: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true, senderId: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const result = conversations.map((conv) => {
    const other =
      conv.participant1Id === userId ? conv.participant2 : conv.participant1;
    const lastMessage = conv.messages[0] ?? null;
    return {
      id: conv.id,
      other: { id: other.id, name: other.name, avatarUrl: other.avatarUrl },
      lastMessage: lastMessage
        ? {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt.toISOString(),
            senderId: lastMessage.senderId,
          }
        : null,
      updatedAt: conv.updatedAt.toISOString(),
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json();
  const { recipientId } = body;

  if (!recipientId || typeof recipientId !== "string") {
    return NextResponse.json(
      { error: "recipientId is required" },
      { status: 400 }
    );
  }

  if (recipientId === userId) {
    return NextResponse.json(
      { error: "Cannot chat with yourself" },
      { status: 400 }
    );
  }

  const allowed = await canDirectChat(userId, recipientId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Chat request required" },
      { status: 403 }
    );
  }

  // Normalize participant order: smaller ID = participant1
  const [p1, p2] =
    userId < recipientId ? [userId, recipientId] : [recipientId, userId];

  const conversation = await prisma.conversation.upsert({
    where: {
      participant1Id_participant2Id: { participant1Id: p1, participant2Id: p2 },
    },
    create: { participant1Id: p1, participant2Id: p2 },
    update: {},
    include: {
      participant1: { select: { id: true, name: true, avatarUrl: true } },
      participant2: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  const other =
    conversation.participant1Id === userId
      ? conversation.participant2
      : conversation.participant1;

  return NextResponse.json(
    {
      id: conversation.id,
      other: { id: other.id, name: other.name, avatarUrl: other.avatarUrl },
      updatedAt: conversation.updatedAt.toISOString(),
    },
    { status: 201 }
  );
}
