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

  const { id: groupConversationId } = await params;
  const userId = session.user.id;

  const member = await prisma.groupMember.findUnique({
    where: {
      groupConversationId_userId: { groupConversationId, userId },
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { showReadReceipts: true },
  });

  if (!user?.showReadReceipts) {
    return NextResponse.json({ readAt: null });
  }

  const now = new Date();

  await prisma.groupMember.update({
    where: { id: member.id },
    data: { lastReadAt: now },
  });

  const readAt = now.toISOString();

  try {
    const rest = getAblyRest();
    const channel = rest.channels.get(`group:${groupConversationId}`);
    await channel.publish("read", { userId, readAt });
  } catch {
    // Non-fatal
  }

  return NextResponse.json({ readAt });
}
