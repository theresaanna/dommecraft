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

  const groups = await prisma.groupConversation.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      members: {
        select: { userId: true },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          content: true,
          createdAt: true,
          senderId: true,
          mediaMimeType: true,
          sender: { select: { name: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const result = groups.map((group) => {
    const lastMessage = group.messages[0] ?? null;
    return {
      id: group.id,
      name: group.name,
      memberCount: group.members.length,
      lastMessage: lastMessage
        ? {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt.toISOString(),
            senderId: lastMessage.senderId,
            senderName: lastMessage.sender.name,
            mediaMimeType: lastMessage.mediaMimeType,
          }
        : null,
      updatedAt: group.updatedAt.toISOString(),
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
  const { name, memberIds } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json(
      { error: "Group name is required" },
      { status: 400 }
    );
  }

  const trimmedName = name.trim();
  if (trimmedName.length > 100) {
    return NextResponse.json(
      { error: "Group name must be 100 characters or less" },
      { status: 400 }
    );
  }

  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return NextResponse.json(
      { error: "At least one member is required" },
      { status: 400 }
    );
  }

  // Filter out current user from memberIds if included
  const otherMemberIds = memberIds.filter(
    (id: string) => typeof id === "string" && id !== userId
  );

  if (otherMemberIds.length === 0) {
    return NextResponse.json(
      { error: "At least one other member is required" },
      { status: 400 }
    );
  }

  // Verify access for each member
  for (const memberId of otherMemberIds) {
    const allowed = await canDirectChat(userId, memberId);
    if (!allowed) {
      return NextResponse.json(
        { error: `Cannot add user ${memberId} to group` },
        { status: 403 }
      );
    }
  }

  const group = await prisma.$transaction(async (tx) => {
    const created = await tx.groupConversation.create({
      data: {
        name: trimmedName,
        createdById: userId,
        members: {
          create: [
            { userId, role: "ADMIN" },
            ...otherMemberIds.map((id: string) => ({
              userId: id,
              role: "MEMBER" as const,
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
    return created;
  });

  return NextResponse.json(
    {
      id: group.id,
      name: group.name,
      members: group.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
      })),
      updatedAt: group.updatedAt.toISOString(),
    },
    { status: 201 }
  );
}
