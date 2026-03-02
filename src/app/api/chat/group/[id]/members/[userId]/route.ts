import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isGroupMember, isGroupAdmin } from "@/lib/group-chat-access";
import { getAblyRest } from "@/lib/ably";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, userId: targetUserId } = await params;
  const currentUserId = session.user.id;

  const { isMember } = await isGroupMember(id, currentUserId);
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const removingSelf = currentUserId === targetUserId;

  if (removingSelf) {
    const members = await prisma.groupMember.findMany({
      where: { groupConversationId: id },
      select: { userId: true, role: true },
    });

    const adminCount = members.filter((m) => m.role === "ADMIN").length;
    const totalMembers = members.length;

    if (adminCount === 1 && members.find((m) => m.userId === currentUserId)?.role === "ADMIN" && totalMembers > 1) {
      return NextResponse.json(
        { error: "Transfer admin role before leaving" },
        { status: 400 }
      );
    }

    if (totalMembers === 1) {
      // Last member — delete entire group conversation (cascades members and messages)
      await prisma.groupConversation.delete({
        where: { id },
      });
    } else {
      await prisma.groupMember.delete({
        where: {
          groupConversationId_userId: {
            groupConversationId: id,
            userId: currentUserId,
          },
        },
      });
    }
  } else {
    // Removing another user — must be admin
    const admin = await isGroupAdmin(id, currentUserId);
    if (!admin) {
      return NextResponse.json(
        { error: "Only admins can remove members" },
        { status: 403 }
      );
    }

    await prisma.groupMember.delete({
      where: {
        groupConversationId_userId: {
          groupConversationId: id,
          userId: targetUserId,
        },
      },
    });
  }

  try {
    const channel = getAblyRest().channels.get(`group:${id}`);
    await channel.publish("member-removed", {
      userId: targetUserId,
      removedBy: currentUserId,
    });
  } catch {
    // Non-fatal
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, userId: targetUserId } = await params;
  const currentUserId = session.user.id;

  const admin = await isGroupAdmin(id, currentUserId);
  if (!admin) {
    return NextResponse.json(
      { error: "Only admins can change member roles" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { role } = body;

  if (!role || (role !== "ADMIN" && role !== "MEMBER")) {
    return NextResponse.json(
      { error: "Role must be ADMIN or MEMBER" },
      { status: 400 }
    );
  }

  // If demoting, check if target is the last admin
  if (role === "MEMBER") {
    const admins = await prisma.groupMember.findMany({
      where: {
        groupConversationId: id,
        role: "ADMIN",
      },
      select: { userId: true },
    });

    if (admins.length === 1 && admins[0].userId === targetUserId) {
      return NextResponse.json(
        { error: "Cannot demote the last admin" },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.groupMember.update({
    where: {
      groupConversationId_userId: {
        groupConversationId: id,
        userId: targetUserId,
      },
    },
    data: { role },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  try {
    const channel = getAblyRest().channels.get(`group:${id}`);
    await channel.publish("member-updated", {
      id: updated.user.id,
      name: updated.user.name,
      avatarUrl: updated.user.avatarUrl,
      role: updated.role,
    });
  } catch {
    // Non-fatal
  }

  return NextResponse.json({
    id: updated.user.id,
    name: updated.user.name,
    avatarUrl: updated.user.avatarUrl,
    role: updated.role,
  });
}
