import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ChatListClient from "./ChatListClient";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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

  const serialized = conversations.map((conv) => {
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Chat
      </h1>
      <ChatListClient conversations={serialized} />
    </div>
  );
}
