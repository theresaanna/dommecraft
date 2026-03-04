"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type Ably from "ably";
import { useAbly } from "@/components/providers/ably-provider";

const TYPING_TIMEOUT_MS = 3000;

export type ConversationRef = {
  id: string;
  type: "dm" | "group";
  otherName?: string | null;
};

type TypingEntry = {
  name: string;
  timeout: ReturnType<typeof setTimeout>;
};

/**
 * Subscribe to typing events across multiple conversations.
 * Read-only — does not publish typing events.
 */
export function useDrawerTyping(conversations: ConversationRef[]) {
  const { client } = useAbly();
  const [typingMap, setTypingMap] = useState<
    Map<string, Map<string, TypingEntry>>
  >(new Map());

  const convsRef = useRef(conversations);
  convsRef.current = conversations;

  // Stable dependency key — only re-subscribe when conversation list changes
  const convKeys = conversations.map((c) => `${c.type}-${c.id}`).join(",");

  useEffect(() => {
    if (!client || convsRef.current.length === 0) return;

    const convs = convsRef.current;
    const subscriptions: Array<{
      channel: Ably.RealtimeChannel;
      handler: (msg: Ably.InboundMessage) => void;
    }> = [];

    for (const conv of convs) {
      const channelName =
        conv.type === "dm" ? `chat:${conv.id}` : `group:${conv.id}`;
      const key = `${conv.type}-${conv.id}`;
      const channel = client.channels.get(channelName);

      const handler = (msg: Ably.InboundMessage) => {
        const data = msg.data as {
          userId: string;
          userName?: string;
          isTyping: boolean;
        };
        if (data.userId === client.auth.clientId) return;

        const displayName =
          conv.type === "dm"
            ? conv.otherName || "Someone"
            : data.userName || "Someone";

        if (data.isTyping) {
          setTypingMap((prev) => {
            const next = new Map(prev);
            const convMap = new Map(next.get(key) || new Map());

            const existing = convMap.get(data.userId);
            if (existing) clearTimeout(existing.timeout);

            const timeout = setTimeout(() => {
              setTypingMap((p) => {
                const n = new Map(p);
                const cm = new Map(n.get(key) || new Map());
                cm.delete(data.userId);
                if (cm.size === 0) n.delete(key);
                else n.set(key, cm);
                return n;
              });
            }, TYPING_TIMEOUT_MS);

            convMap.set(data.userId, { name: displayName, timeout });
            next.set(key, convMap);
            return next;
          });
        } else {
          setTypingMap((prev) => {
            const next = new Map(prev);
            const convMap = new Map(next.get(key) || new Map());
            const existing = convMap.get(data.userId);
            if (existing) clearTimeout(existing.timeout);
            convMap.delete(data.userId);
            if (convMap.size === 0) next.delete(key);
            else next.set(key, convMap);
            return next;
          });
        }
      };

      channel.subscribe("typing", handler);
      subscriptions.push({ channel, handler });
    }

    return () => {
      for (const sub of subscriptions) {
        sub.channel.unsubscribe("typing", sub.handler);
      }
      setTypingMap((prev) => {
        prev.forEach((convMap) => {
          convMap.forEach((entry) => clearTimeout(entry.timeout));
        });
        return new Map();
      });
    };
  }, [client, convKeys]);

  const getTypingDisplay = useCallback(
    (key: string): string | null => {
      const convMap = typingMap.get(key);
      if (!convMap || convMap.size === 0) return null;

      const names = Array.from(convMap.values()).map((e) => e.name);
      if (names.length === 1) return `${names[0]} is typing...`;
      if (names.length === 2)
        return `${names[0]} and ${names[1]} are typing...`;
      return `${names.length} people are typing...`;
    },
    [typingMap]
  );

  return { getTypingDisplay };
}
