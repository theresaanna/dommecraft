"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type Ably from "ably";
import { useAbly } from "@/components/providers/ably-provider";
import { usePresence } from "@/hooks/use-presence";

type Reaction = {
  emoji: string;
  userId: string;
};

type Message = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  reactions: Reaction[];
};

type OtherUser = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

type ReactionEvent = {
  messageId: string;
  emoji: string;
  userId: string;
  action: "add" | "remove";
};

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function groupReactions(reactions: Reaction[]) {
  const map = new Map<string, string[]>();
  for (const r of reactions) {
    const users = map.get(r.emoji) || [];
    users.push(r.userId);
    map.set(r.emoji, users);
  }
  return map;
}

export default function ChatClient({
  conversationId,
  currentUserId,
  other,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  other: OtherUser;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { client: ablyClient } = useAbly();
  const { isOnline } = usePresence();

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Subscribe to Ably channel for real-time messages and reactions
  useEffect(() => {
    if (!ablyClient) return;

    const channel = ablyClient.channels.get(`chat:${conversationId}`);

    const onMessage = (msg: Ably.InboundMessage) => {
      const data = msg.data as Message;
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, { ...data, reactions: data.reactions || [] }];
      });
    };

    const onReaction = (msg: Ably.InboundMessage) => {
      const data = msg.data as ReactionEvent;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== data.messageId) return m;
          if (data.action === "add") {
            const already = m.reactions.some(
              (r) => r.emoji === data.emoji && r.userId === data.userId
            );
            if (already) return m;
            return {
              ...m,
              reactions: [...m.reactions, { emoji: data.emoji, userId: data.userId }],
            };
          } else {
            return {
              ...m,
              reactions: m.reactions.filter(
                (r) => !(r.emoji === data.emoji && r.userId === data.userId)
              ),
            };
          }
        })
      );
    };

    channel.subscribe("message", onMessage);
    channel.subscribe("reaction", onReaction);

    return () => {
      channel.unsubscribe("message", onMessage);
      channel.unsubscribe("reaction", onReaction);
    };
  }, [ablyClient, conversationId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");

    try {
      const res = await fetch(`/api/chat/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok) return;

      const message: Message = await res.json();

      // Add to local state (dedupe in case Ably already delivered it)
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, { ...message, reactions: message.reactions || [] }];
      });
    } finally {
      setSending(false);
    }
  }

  async function handleReaction(messageId: string, emoji: string) {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    const hasReacted = msg.reactions.some(
      (r) => r.emoji === emoji && r.userId === currentUserId
    );

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        if (hasReacted) {
          return {
            ...m,
            reactions: m.reactions.filter(
              (r) => !(r.emoji === emoji && r.userId === currentUserId)
            ),
          };
        } else {
          return {
            ...m,
            reactions: [...m.reactions, { emoji, userId: currentUserId }],
          };
        }
      })
    );

    setPickerOpenFor(null);

    try {
      const res = await fetch(
        `/api/chat/${conversationId}/messages/${messageId}/reactions`,
        {
          method: hasReacted ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
        }
      );

      if (!res.ok) {
        // Revert optimistic update on failure
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;
            if (hasReacted) {
              return {
                ...m,
                reactions: [...m.reactions, { emoji, userId: currentUserId }],
              };
            } else {
              return {
                ...m,
                reactions: m.reactions.filter(
                  (r) => !(r.emoji === emoji && r.userId === currentUserId)
                ),
              };
            }
          })
        );
      }
    } catch {
      // Revert on network error
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          if (hasReacted) {
            return {
              ...m,
              reactions: [...m.reactions, { emoji, userId: currentUserId }],
            };
          } else {
            return {
              ...m,
              reactions: m.reactions.filter(
                (r) => !(r.emoji === emoji && r.userId === currentUserId)
              ),
            };
          }
        })
      );
    }
  }

  return (
    <div className="flex h-dvh flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <Link
          href="/chat"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          &larr; Back
        </Link>
        <span className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {other.name || "Unknown"}
          <span
            data-testid="presence-indicator"
            className={`inline-block h-2 w-2 rounded-full ${
              isOnline(other.id)
                ? "bg-green-500"
                : "bg-zinc-300 dark:bg-zinc-600"
            }`}
          />
        </span>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            No messages yet. Say hello!
          </p>
        )}
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {messages.map((msg) => {
            const isMine = msg.senderId === currentUserId;
            const grouped = groupReactions(msg.reactions);
            const hasReactions = grouped.size > 0;
            return (
              <div
                key={msg.id}
                data-message-id={msg.id}
                className={`group relative flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[75%]">
                  <div
                    className={`rounded-lg px-3 py-2 text-sm ${
                      isMine
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                    <time className="mt-1 block text-xs opacity-60">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>

                  {/* Reactions display */}
                  {hasReactions && (
                    <div data-testid="reactions" className="mt-1 flex flex-wrap gap-1">
                      {Array.from(grouped.entries()).map(([emoji, userIds]) => {
                        const iReacted = userIds.includes(currentUserId);
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            aria-label={emoji}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                              iReacted
                                ? "bg-blue-100 border-blue-300 dark:bg-blue-900 dark:border-blue-700"
                                : "bg-zinc-50 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700"
                            }`}
                          >
                            {emoji} {userIds.length}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Emoji picker */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setPickerOpenFor(pickerOpenFor === msg.id ? null : msg.id)
                      }
                      aria-label="add reaction"
                      className="mt-1 text-xs text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                    >
                      +
                    </button>
                    {pickerOpenFor === msg.id && (
                      <div className="absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 shadow-md dark:border-zinc-700 dark:bg-zinc-800">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            aria-label={emoji}
                            className="rounded p-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800"
      >
        <div className="mx-auto flex max-w-2xl gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
