"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type Ably from "ably";
import { useAbly } from "@/components/providers/ably-provider";

type Message = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
};

type OtherUser = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const { client: ablyClient } = useAbly();

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Subscribe to Ably channel for real-time messages
  useEffect(() => {
    if (!ablyClient) return;

    const channel = ablyClient.channels.get(`chat:${conversationId}`);

    const onMessage = (msg: Ably.InboundMessage) => {
      const data = msg.data as Message;
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    };

    channel.subscribe("message", onMessage);

    return () => {
      channel.unsubscribe("message", onMessage);
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
        return [...prev, message];
      });

      // Publish to Ably so the other participant gets it instantly
      if (ablyClient) {
        const channel = ablyClient.channels.get(`chat:${conversationId}`);
        channel.publish("message", message);
      }
    } finally {
      setSending(false);
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
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {other.name || "Unknown"}
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
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
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
