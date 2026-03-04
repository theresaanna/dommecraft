"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePresence } from "@/hooks/use-presence";
import {
  useDrawerTyping,
  type ConversationRef,
} from "@/hooks/use-drawer-typing";

type DMSummary = {
  id: string;
  type: "dm";
  other: { id: string; name: string | null; avatarUrl: string | null };
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
    mediaMimeType?: string | null;
  } | null;
  updatedAt: string;
};

type GroupSummary = {
  id: string;
  type: "group";
  name: string;
  memberCount: number;
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
    senderName: string | null;
    mediaMimeType?: string | null;
  } | null;
  updatedAt: string;
};

type ConversationItem = DMSummary | GroupSummary;

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

export default function ChatDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { isOnline } = usePresence();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const convRefs = useMemo<ConversationRef[]>(
    () =>
      conversations.map((c) => ({
        id: c.id,
        type: c.type,
        otherName: c.type === "dm" ? c.other.name : undefined,
      })),
    [conversations]
  );
  const { getTypingDisplay } = useDrawerTyping(convRefs);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [dmRes, groupRes] = await Promise.all([
        fetch("/api/chat"),
        fetch("/api/chat/group"),
      ]);
      if (!dmRes.ok || !groupRes.ok) {
        setError(true);
        return;
      }
      const dms = await dmRes.json();
      const groups = await groupRes.json();

      const dmItems: ConversationItem[] = dms.map(
        (dm: DMSummary["lastMessage"] extends null ? never : Record<string, unknown>) => ({
          ...dm,
          type: "dm" as const,
        })
      );
      const groupItems: ConversationItem[] = groups.map(
        (g: Record<string, unknown>) => ({
          ...g,
          type: "group" as const,
        })
      );

      const merged = [...dmItems, ...groupItems].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setConversations(merged);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchConversations();
    }
  }, [open, fetchConversations]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  function renderLastMessage(conv: ConversationItem) {
    if (!conv.lastMessage) {
      return (
        <p className="text-sm italic text-zinc-400 dark:text-zinc-500">
          No messages yet
        </p>
      );
    }

    if (conv.lastMessage.content) {
      const prefix =
        conv.type === "group" && (conv as GroupSummary).lastMessage?.senderName
          ? `${(conv as GroupSummary).lastMessage!.senderName}: `
          : "";
      return (
        <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
          {prefix}
          {conv.lastMessage.content}
        </p>
      );
    }

    if (conv.lastMessage.mediaMimeType?.startsWith("video/")) {
      return (
        <p className="truncate text-sm italic text-zinc-400 dark:text-zinc-500">
          Video message
        </p>
      );
    }
    if (conv.lastMessage.mediaMimeType?.startsWith("image/")) {
      return (
        <p className="truncate text-sm italic text-zinc-400 dark:text-zinc-500">
          Picture message
        </p>
      );
    }
    return (
      <p className="truncate text-sm italic text-zinc-400 dark:text-zinc-500">
        Media message
      </p>
    );
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          data-testid="chat-drawer-backdrop"
          className="fixed inset-0 z-40 bg-black/30"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        data-testid="chat-drawer"
        role="dialog"
        aria-label="Chat list"
        className={`fixed z-50 bg-white transition-transform duration-200 ease-in-out dark:bg-zinc-950
          bottom-0 right-0 h-[80dvh] w-full rounded-t-2xl border-t border-zinc-200 dark:border-zinc-800
          md:top-14 md:h-[calc(100dvh-3.5rem)] md:w-96 md:rounded-t-none md:rounded-l-2xl md:border-t-0 md:border-l
          ${
            open
              ? "translate-y-0 md:translate-x-0 md:translate-y-0"
              : "translate-y-full md:translate-x-full md:translate-y-0"
          }
        `}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Chats
          </h2>
          <button
            onClick={onClose}
            aria-label="Close chat drawer"
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <p
              data-testid="chat-drawer-loading"
              className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
            >
              Loading...
            </p>
          )}

          {error && !loading && (
            <p
              data-testid="chat-drawer-error"
              className="px-4 py-8 text-center text-sm text-red-500 dark:text-red-400"
            >
              Failed to load chats.
            </p>
          )}

          {!loading && !error && conversations.length === 0 && (
            <p
              data-testid="chat-drawer-empty"
              className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
            >
              No conversations yet.
            </p>
          )}

          {!loading && !error && conversations.length > 0 && (
            <ul
              data-testid="chat-drawer-list"
              className="divide-y divide-zinc-100 dark:divide-zinc-800/50"
            >
              {conversations.map((conv) => {
                const href =
                  conv.type === "dm"
                    ? `/chat/${conv.id}`
                    : `/chat/group/${conv.id}`;

                return (
                  <li key={`${conv.type}-${conv.id}`}>
                    <Link
                      href={href}
                      onClick={onClose}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      <div className="relative shrink-0">
                        {conv.type === "dm" ? (
                          <>
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
                            <span
                              data-testid={`drawer-presence-${conv.other.id}`}
                              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-950 ${
                                isOnline(conv.other.id)
                                  ? "bg-green-500"
                                  : "bg-zinc-300 dark:bg-zinc-600"
                              }`}
                            />
                          </>
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            {getInitials(conv.name)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {conv.type === "dm"
                              ? conv.other.name || "Unknown"
                              : conv.name}
                          </span>
                          {conv.lastMessage && (
                            <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                              {formatTime(conv.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        {(() => {
                          const typingText = getTypingDisplay(
                            `${conv.type}-${conv.id}`
                          );
                          if (typingText) {
                            return (
                              <p
                                data-testid={`drawer-typing-${conv.type}-${conv.id}`}
                                className="truncate text-sm text-zinc-400 dark:text-zinc-500"
                              >
                                {typingText.replace("...", "")}
                                <span className="animate-pulse">...</span>
                              </p>
                            );
                          }
                          return renderLastMessage(conv);
                        })()}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer link */}
        <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <Link
            href="/chat"
            onClick={onClose}
            className="block text-center text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Open full chat
          </Link>
        </div>
      </div>
    </>
  );
}
