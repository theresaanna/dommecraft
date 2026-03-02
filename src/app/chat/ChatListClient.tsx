"use client";

import Link from "next/link";

type ConversationSummary = {
  id: string;
  other: { id: string; name: string | null; avatarUrl: string | null };
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  updatedAt: string;
};

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ChatListClient({
  conversations,
}: {
  conversations: ConversationSummary[];
}) {
  if (conversations.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No conversations yet.
      </p>
    );
  }

  return (
    <ul className="mt-6 divide-y divide-zinc-200 dark:divide-zinc-800">
      {conversations.map((conv) => (
        <li key={conv.id}>
          <Link
            href={`/chat/${conv.id}`}
            className="flex items-center gap-3 px-2 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
          >
            {conv.other.avatarUrl ? (
              <img
                src={conv.other.avatarUrl}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                {getInitials(conv.other.name)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {conv.other.name || "Unknown"}
                </span>
                {conv.lastMessage && (
                  <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatTime(conv.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              {conv.lastMessage && (
                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                  {conv.lastMessage.content}
                </p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
