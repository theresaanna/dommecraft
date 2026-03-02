"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAbly } from "@/components/providers/ably-provider";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import Toast from "@/components/Toast";

type ToastData = {
  id: string;
  message: string;
  linkUrl: string | null;
  type: string;
};

const CHAT_NOTIFICATION_TYPES = ["CHAT_MESSAGE", "GROUP_CHAT_MESSAGE"];

type UnreadChatContextValue = {
  unreadChatCount: number;
  unreadCount: number;
  clearUnreadChats: () => void;
};

const UnreadChatContext = createContext<UnreadChatContextValue>({
  unreadChatCount: 0,
  unreadCount: 0,
  clearUnreadChats: () => {},
});

export function useUnreadChats() {
  return useContext(UnreadChatContext);
}

function triggerOSNotification(message: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification("DommeCraft", { body: message });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification("DommeCraft", { body: message });
      }
    });
  }
}

/**
 * Dispatch this event after any action that creates a notification
 * to trigger an immediate poll instead of waiting for the next interval.
 */
export function triggerNotificationRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("notifications:refresh"));
  }
}

const DEFAULT_POLL_INTERVAL = 30000;

export function NotificationProvider({
  children,
  pollInterval = DEFAULT_POLL_INTERVAL,
}: {
  children: ReactNode;
  pollInterval?: number;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const { client: ablyClient } = useAbly();
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);
  const pollRef = useRef<(() => void) | null>(null);
  const { play: playNotificationSound } = useNotificationSound(
    session?.user?.notificationSound ?? true
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearUnreadChats = useCallback(async () => {
    setUnreadChatCount(0);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    async function poll() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;

        const notifications: Array<{
          id: string;
          message: string;
          linkUrl: string | null;
          type: string;
        }> = await res.json();

        // Track unread notification counts
        setUnreadCount(notifications.length);
        const chatCount = notifications.filter((n) =>
          CHAT_NOTIFICATION_TYPES.includes(n.type)
        ).length;
        setUnreadChatCount(chatCount);

        // On first load, seed seenIds without showing toasts
        if (!initialLoadDone.current) {
          notifications.forEach((n) => seenIds.current.add(n.id));
          initialLoadDone.current = true;
          return;
        }

        const newNotifications = notifications.filter(
          (n) => !seenIds.current.has(n.id)
        );

        if (newNotifications.length > 0) {
          const hasChatNotification = newNotifications.some((n) =>
            CHAT_NOTIFICATION_TYPES.includes(n.type)
          );

          newNotifications.forEach((n) => {
            seenIds.current.add(n.id);

            setToasts((prev) => [
              ...prev,
              {
                id: n.id,
                message: n.message,
                linkUrl: n.linkUrl,
                type: n.type,
              },
            ]);

            triggerOSNotification(n.message);
          });

          // Play notification sound for chat messages when not on the chat screen
          if (hasChatNotification) {
            playNotificationSound();
          }

          // Re-render server components so notification counts update
          router.refresh();
        }
      } catch {
        // Silently ignore polling errors
      }
    }

    pollRef.current = poll;

    // Poll on tab focus / visibility change
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        poll();
      }
    }

    // Poll on custom refresh event (fired after notification-creating actions)
    function handleRefresh() {
      poll();
    }

    poll();
    const interval = setInterval(poll, pollInterval);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("notifications:refresh", handleRefresh);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("notifications:refresh", handleRefresh);
    };
  }, [session?.user?.id, pollInterval, playNotificationSound]);

  // Subscribe to user-specific Ably channel for instant notification delivery
  useEffect(() => {
    if (!ablyClient || !session?.user?.id) return;

    const channel = ablyClient.channels.get(
      `user-notifications:${session.user.id}`
    );

    const onNotify = () => {
      // Trigger an immediate poll instead of waiting for the next interval
      pollRef.current?.();
    };

    channel.subscribe("notify", onNotify);

    return () => {
      channel.unsubscribe("notify", onNotify);
    };
  }, [ablyClient, session?.user?.id]);

  return (
    <UnreadChatContext.Provider value={{ unreadChatCount, unreadCount, clearUnreadChats }}>
      {children}
      <div className="fixed right-4 top-16 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </div>
    </UnreadChatContext.Provider>
  );
}
