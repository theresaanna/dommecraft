import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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
      participant1: { select: { id: true, name: true, avatarUrl: true } },
      participant2: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  if (!conversation) notFound();

  if (
    conversation.participant1Id !== userId &&
    conversation.participant2Id !== userId
  ) {
    redirect("/chat");
  }

  const other =
    conversation.participant1Id === userId
      ? conversation.participant2
      : conversation.participant1;

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { id: true, senderId: true, content: true, createdAt: true },
  });

  const serializedMessages = messages.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <ChatClient
      conversationId={conversationId}
      currentUserId={userId}
      other={{ id: other.id, name: other.name, avatarUrl: other.avatarUrl }}
      initialMessages={serializedMessages}
    />
  );
}
