"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

type Contact = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
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
  const router = useRouter();
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  async function handleNewChat() {
    if (showContacts) {
      setShowContacts(false);
      return;
    }

    setLoadingContacts(true);
    try {
      const res = await fetch("/api/chat/contacts");
      if (!res.ok) return;
      const data: Contact[] = await res.json();

      // Filter out users who already have conversations
      const existingIds = new Set(conversations.map((c) => c.other.id));
      setContacts(data.filter((c) => !existingIds.has(c.id)));
      setShowContacts(true);
    } finally {
      setLoadingContacts(false);
    }
  }

  async function startConversation(recipientId: string) {
    setStarting(recipientId);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId }),
      });
      if (!res.ok) return;
      const data = await res.json();
      router.push(`/chat/${data.id}`);
    } finally {
      setStarting(null);
    }
  }

  return (
    <>
      <div className="mt-6">
        <button
          onClick={handleNewChat}
          disabled={loadingContacts}
          className="w-full rounded-lg border border-zinc-200 px-4 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900/50"
        >
          {loadingContacts
            ? "Loading..."
            : showContacts
              ? "Cancel"
              : "New Chat"}
        </button>
      </div>

      {showContacts && (
        <div className="mt-4">
          {contacts.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              No new contacts available.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {contacts.map((contact) => (
                <li key={contact.id}>
                  <button
                    onClick={() => startConversation(contact.id)}
                    disabled={starting === contact.id}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 disabled:opacity-50 dark:hover:bg-zinc-900/50"
                  >
                    {contact.avatarUrl ? (
                      <img
                        src={contact.avatarUrl}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                        {getInitials(contact.name)}
                      </span>
                    )}
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {contact.name || "Unknown"}
                    </span>
                    {starting === contact.id && (
                      <span className="ml-auto text-xs text-zinc-500">
                        Starting...
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {conversations.length === 0 && !showContacts ? (
        <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No conversations yet.
        </p>
      ) : (
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
      )}
    </>
  );
}
