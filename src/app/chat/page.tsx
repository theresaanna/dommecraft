import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ChatListClient from "./ChatListClient";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [conversations, groupConversations] = await Promise.all([
    prisma.conversation.findMany({
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
    }),
    prisma.groupConversation.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        members: { select: { userId: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            content: true,
            createdAt: true,
            senderId: true,
            sender: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const serializedDMs = conversations.map((conv) => {
    const other =
      conv.participant1Id === userId ? conv.participant2 : conv.participant1;
    const lastMessage = conv.messages[0] ?? null;
    return {
      id: conv.id,
      type: "dm" as const,
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

  const serializedGroups = groupConversations.map((group) => {
    const lastMessage = group.messages[0] ?? null;
    return {
      id: group.id,
      type: "group" as const,
      name: group.name,
      memberCount: group.members.length,
      lastMessage: lastMessage
        ? {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt.toISOString(),
            senderId: lastMessage.senderId,
            senderName: lastMessage.sender.name,
          }
        : null,
      updatedAt: group.updatedAt.toISOString(),
    };
  });

  // Merge and sort by updatedAt descending
  const allConversations = [...serializedDMs, ...serializedGroups].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
        Chat
      </h1>
      <ChatListClient conversations={allConversations} />
    </div>
  );
}
