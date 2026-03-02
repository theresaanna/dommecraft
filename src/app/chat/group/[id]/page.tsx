import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAblyRest } from "@/lib/ably";
import GroupChatClient from "./GroupChatClient";

export default async function GroupChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id: groupConversationId } = await params;
  const userId = session.user.id;

  const group = await prisma.groupConversation.findUnique({
    where: { id: groupConversationId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              role: true,
              showReadReceipts: true,
              notificationSound: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!group) notFound();

  const currentMember = group.members.find((m) => m.userId === userId);
  if (!currentMember) redirect("/chat");

  const messages = await prisma.chatMessage.findMany({
    where: { groupConversationId },
    orderBy: { createdAt: "asc" },
    take: 50,
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
      replyTo: {
        select: {
          id: true,
          content: true,
          senderId: true,
          sender: { select: { name: true } },
        },
      },
      sender: { select: { name: true } },
    },
  });

  const serializedMessages = messages.map((m) => ({
    ...m,
    senderName: m.sender.name,
    editedAt: m.editedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    replyTo: m.replyTo
      ? {
          id: m.replyTo.id,
          content: m.replyTo.content,
          senderName: m.replyTo.sender.name,
        }
      : null,
  }));

  const members = group.members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    avatarUrl: m.user.avatarUrl,
    role: m.role,
    userRole: m.user.role,
  }));

  // Build read receipts map
  const memberReadReceipts: Record<string, string | null> = {};
  for (const m of group.members) {
    if (m.userId !== userId) {
      memberReadReceipts[m.userId] = m.lastReadAt?.toISOString() ?? null;
    }
  }

  const currentUser = currentMember.user;

  // Auto-mark as read on page load
  if (currentUser.showReadReceipts) {
    const now = new Date();
    try {
      await prisma.groupMember.update({
        where: { id: currentMember.id },
        data: { lastReadAt: now },
      });
      const rest = getAblyRest();
      const channel = rest.channels.get(`group:${groupConversationId}`);
      await channel.publish("read", { userId, readAt: now.toISOString() });
    } catch {
      // Non-fatal
    }
  }

  return (
    <GroupChatClient
      groupConversationId={groupConversationId}
      currentUserId={userId}
      currentUserName={currentUser.name ?? "Unknown"}
      groupName={group.name}
      members={members}
      initialMessages={serializedMessages}
      memberReadReceipts={memberReadReceipts}
      showReadReceipts={currentUser.showReadReceipts}
      notificationSound={currentUser.notificationSound}
      currentUserRole={currentMember.role}
    />
  );
}
