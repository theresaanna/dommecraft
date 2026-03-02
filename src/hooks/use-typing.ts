"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type Ably from "ably";
import { useAbly } from "@/components/providers/ably-provider";

const TYPING_TIMEOUT_MS = 3000;
const DEBOUNCE_MS = 1000;

/**
 * Hook for 1-to-1 conversation typing indicators.
 */
export function useTyping(conversationId: string, currentUserId: string) {
  const { client } = useAbly();
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Subscribe to typing events from the other user
  useEffect(() => {
    if (!client) return;

    const channel = client.channels.get(`chat:${conversationId}`);

    const onTyping = (msg: Ably.InboundMessage) => {
      const data = msg.data as { userId: string; isTyping: boolean };
      if (data.userId === currentUserId) return;

      if (data.isTyping) {
        setIsOtherTyping(true);

        // Clear any existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Auto-expire after timeout in case we miss the stop event
        typingTimeoutRef.current = setTimeout(() => {
          setIsOtherTyping(false);
        }, TYPING_TIMEOUT_MS);
      } else {
        setIsOtherTyping(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    };

    channel.subscribe("typing", onTyping);

    return () => {
      channel.unsubscribe("typing", onTyping);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [client, conversationId, currentUserId]);

  // Publish typing start/stop events
  const publishTyping = useCallback(
    (isTyping: boolean) => {
      if (!client) return;
      const channel = client.channels.get(`chat:${conversationId}`);
      channel.publish("typing", { userId: currentUserId, isTyping });
    },
    [client, conversationId, currentUserId]
  );

  // Called on every input change — debounces the "stop" signal
  const onKeyStroke = useCallback(() => {
    if (!client) return;

    // Send start typing if not already typing
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      publishTyping(true);
    }

    // Reset debounce timer for stop
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      isTypingRef.current = false;
      publishTyping(false);
    }, DEBOUNCE_MS);
  }, [client, publishTyping]);

  // Send stop on unmount
  useEffect(() => {
    return () => {
      if (isTypingRef.current) {
        publishTyping(false);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [publishTyping]);

  // Reset local typing state when a message is sent
  const onMessageSent = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      publishTyping(false);
    }
  }, [publishTyping]);

  return { isOtherTyping, onKeyStroke, onMessageSent };
}

type TypingUser = {
  name: string;
  timeout: ReturnType<typeof setTimeout>;
};

/**
 * Hook for group conversation typing indicators.
 * Tracks multiple users typing simultaneously.
 */
export function useGroupTyping(
  groupConversationId: string,
  currentUserId: string,
  currentUserName: string
) {
  const { client } = useAbly();
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(
    new Map()
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Subscribe to typing events from other group members
  useEffect(() => {
    if (!client) return;

    const channel = client.channels.get(`group:${groupConversationId}`);

    const onTyping = (msg: Ably.InboundMessage) => {
      const data = msg.data as {
        userId: string;
        userName: string;
        isTyping: boolean;
      };
      if (data.userId === currentUserId) return;

      if (data.isTyping) {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          // Clear existing timeout for this user
          const existing = next.get(data.userId);
          if (existing) clearTimeout(existing.timeout);

          const timeout = setTimeout(() => {
            setTypingUsers((p) => {
              const n = new Map(p);
              n.delete(data.userId);
              return n;
            });
          }, TYPING_TIMEOUT_MS);

          next.set(data.userId, { name: data.userName, timeout });
          return next;
        });
      } else {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          const existing = next.get(data.userId);
          if (existing) clearTimeout(existing.timeout);
          next.delete(data.userId);
          return next;
        });
      }
    };

    channel.subscribe("typing", onTyping);

    return () => {
      channel.unsubscribe("typing", onTyping);
      // Clear all timeouts
      setTypingUsers((prev) => {
        prev.forEach((u) => clearTimeout(u.timeout));
        return new Map();
      });
    };
  }, [client, groupConversationId, currentUserId]);

  const publishTyping = useCallback(
    (isTyping: boolean) => {
      if (!client) return;
      const channel = client.channels.get(`group:${groupConversationId}`);
      channel.publish("typing", {
        userId: currentUserId,
        userName: currentUserName,
        isTyping,
      });
    },
    [client, groupConversationId, currentUserId, currentUserName]
  );

  const onKeyStroke = useCallback(() => {
    if (!client) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      publishTyping(true);
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      isTypingRef.current = false;
      publishTyping(false);
    }, DEBOUNCE_MS);
  }, [client, publishTyping]);

  useEffect(() => {
    return () => {
      if (isTypingRef.current) {
        publishTyping(false);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [publishTyping]);

  const onMessageSent = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      publishTyping(false);
    }
  }, [publishTyping]);

  // Build display string
  const typingNames = Array.from(typingUsers.values()).map((u) => u.name);
  let typingDisplay = "";
  if (typingNames.length === 1) {
    typingDisplay = `${typingNames[0]} is typing...`;
  } else if (typingNames.length === 2) {
    typingDisplay = `${typingNames[0]} and ${typingNames[1]} are typing...`;
  } else if (typingNames.length > 2) {
    typingDisplay = `${typingNames.length} people are typing...`;
  }

  return {
    typingDisplay,
    typingCount: typingNames.length,
    onKeyStroke,
    onMessageSent,
  };
}
