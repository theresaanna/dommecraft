import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isGroupMember, isGroupAdmin } from "@/lib/group-chat-access";
import { getAblyRest } from "@/lib/ably";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const group = await prisma.groupConversation.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const { isMember } = await isGroupMember(id, userId);
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: group.id,
    name: group.name,
    createdById: group.createdById,
    members: group.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    })),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const admin = await isGroupAdmin(id, userId);
  if (!admin) {
    return NextResponse.json(
      { error: "Only admins can update the group" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name } = body;

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

  const updated = await prisma.groupConversation.update({
    where: { id },
    data: { name: trimmedName },
  });

  try {
    const channel = getAblyRest().channels.get(`group:${id}`);
    await channel.publish("group-update", { name: trimmedName });
  } catch {
    // Non-fatal
  }

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    updatedAt: updated.updatedAt.toISOString(),
  });
}
