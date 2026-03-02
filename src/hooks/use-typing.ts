"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type Ably from "ably";
import { useAbly } from "@/components/providers/ably-provider";

const TYPING_TIMEOUT_MS = 3000;
const DEBOUNCE_MS = 1000;

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
