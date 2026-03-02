"use client";

import { useEffect, useState, useCallback } from "react";
import { useAbly, PRESENCE_CHANNEL } from "@/components/providers/ably-provider";

export function usePresence() {
  const { client } = useAbly();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!client) return;

    const channel = client.channels.get(PRESENCE_CHANNEL);

    // Get initial presence members
    channel.presence.get().then((members) => {
      setOnlineUserIds(new Set(members.map((m) => m.clientId)));
    });

    const onEnter = (member: { clientId: string }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.add(member.clientId);
        return next;
      });
    };

    const onLeave = (member: { clientId: string }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(member.clientId);
        return next;
      });
    };

    channel.presence.subscribe("enter", onEnter);
    channel.presence.subscribe("leave", onLeave);

    return () => {
      channel.presence.unsubscribe("enter", onEnter);
      channel.presence.unsubscribe("leave", onLeave);
    };
  }, [client]);

  const isOnline = useCallback(
    (userId: string) => onlineUserIds.has(userId),
    [onlineUserIds]
  );

  return { onlineUserIds, isOnline };
}
