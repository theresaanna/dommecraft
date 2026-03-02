import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isGroupAdmin } from "@/lib/group-chat-access";
import { canDirectChat } from "@/lib/chat-access";
import { getAblyRest } from "@/lib/ably";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const currentUserId = session.user.id;

  const admin = await isGroupAdmin(id, currentUserId);
  if (!admin) {
    return NextResponse.json(
      { error: "Only admins can add members" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { userIds } = body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json(
      { error: "userIds array is required and must not be empty" },
      { status: 400 }
    );
  }

  // Verify chat access for each user
  for (const userId of userIds) {
    const allowed = await canDirectChat(currentUserId, userId);
    if (!allowed) {
      return NextResponse.json(
        { error: `Cannot add user ${userId} to group` },
        { status: 403 }
      );
    }
  }

  // Find existing members to skip duplicates
  const existingMembers = await prisma.groupMember.findMany({
    where: {
      groupConversationId: id,
      userId: { in: userIds },
    },
    select: { userId: true },
  });

  const existingUserIds = new Set(existingMembers.map((m) => m.userId));
  const newUserIds = userIds.filter(
    (uid: string) => !existingUserIds.has(uid)
  );

  if (newUserIds.length === 0) {
    return NextResponse.json({ added: [] });
  }

  // Create new members and fetch their user info
  await prisma.groupMember.createMany({
    data: newUserIds.map((uid: string) => ({
      groupConversationId: id,
      userId: uid,
      role: "MEMBER" as const,
    })),
  });

  const addedMembers = await prisma.groupMember.findMany({
    where: {
      groupConversationId: id,
      userId: { in: newUserIds },
    },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
  });

  const added = addedMembers.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    avatarUrl: m.user.avatarUrl,
    role: m.role,
    userRole: m.user.role,
  }));

  try {
    const channel = getAblyRest().channels.get(`group:${id}`);
    await channel.publish("member-added", { members: added });
  } catch {
    // Non-fatal
  }

  return NextResponse.json({ added });
}
