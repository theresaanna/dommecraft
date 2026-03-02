import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAblyRest } from "@/lib/ably";
import ChatClient from "./ChatClient";

export default async function ChatConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id: conversationId } = await params;
  const userId = session.user.id;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participant1: {
        select: { id: true, name: true, avatarUrl: true, showReadReceipts: true },
      },
      participant2: {
        select: { id: true, name: true, avatarUrl: true, showReadReceipts: true },
      },
    },
  });

  if (!conversation) notFound();

  if (
    conversation.participant1Id !== userId &&
    conversation.participant2Id !== userId
  ) {
    redirect("/chat");
  }

  const isParticipant1 = conversation.participant1Id === userId;
  const currentParticipant = isParticipant1
    ? conversation.participant1
    : conversation.participant2;
  const other = isParticipant1
    ? conversation.participant2
    : conversation.participant1;

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      senderId: true,
      content: true,
      mediaUrl: true,
      mediaMimeType: true,
      mediaFileSize: true,
      createdAt: true,
      reactions: { select: { emoji: true, userId: true } },
    },
  });

  const serializedMessages = messages.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }));

  // Determine read receipt data
  const otherLastReadAt = other.showReadReceipts
    ? (isParticipant1
        ? conversation.participant2LastReadAt
        : conversation.participant1LastReadAt)
    : null;

  // Auto-mark conversation as read on page load (if current user has receipts enabled)
  if (currentParticipant.showReadReceipts) {
    const now = new Date();
    try {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: isParticipant1
          ? { participant1LastReadAt: now }
          : { participant2LastReadAt: now },
      });
      const rest = getAblyRest();
      const channel = rest.channels.get(`chat:${conversationId}`);
      await channel.publish("read", { userId, readAt: now.toISOString() });
    } catch {
      // Non-fatal: page still renders
    }
  }

  return (
    <ChatClient
      conversationId={conversationId}
      currentUserId={userId}
      other={{ id: other.id, name: other.name, avatarUrl: other.avatarUrl }}
      initialMessages={serializedMessages}
      initialOtherLastReadAt={otherLastReadAt?.toISOString() ?? null}
      showReadReceipts={currentParticipant.showReadReceipts}
    />
  );
}
