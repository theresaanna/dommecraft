"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import Toast from "@/components/Toast";

type ToastData = {
  id: string;
  message: string;
  linkUrl: string | null;
  type: string;
};

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

const DEFAULT_POLL_INTERVAL = 30000;

export function NotificationProvider({
  children,
  pollInterval = DEFAULT_POLL_INTERVAL,
}: {
  children: ReactNode;
  pollInterval?: number;
}) {
  const { data: session } = useSession();
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
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

        // On first load, seed seenIds without showing toasts
        if (!initialLoadDone.current) {
          notifications.forEach((n) => seenIds.current.add(n.id));
          initialLoadDone.current = true;
          return;
        }

        const newNotifications = notifications.filter(
          (n) => !seenIds.current.has(n.id)
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
      } catch {
        // Silently ignore polling errors
      }
    }

    poll();
    const interval = setInterval(poll, pollInterval);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  return (
    <>
      {children}
      <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
}
