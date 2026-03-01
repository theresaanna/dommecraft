"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SerializedNotification = {
  id: string;
  type: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  taskId: string | null;
  calendarEventId: string | null;
  createdAt: string;
};

const TYPE_STYLES: Record<string, { label: string; className: string }> = {
  TASK_ASSIGNED: {
    label: "Task",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  TASK_UPDATED: {
    label: "Update",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  TASK_SUBMITTED: {
    label: "Submitted",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  TASK_COMPLETED: {
    label: "Complete",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  CALENDAR_REMINDER: {
    label: "Calendar",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  SUB_JOINED: {
    label: "New Sub",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
};

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsPageClient({
  notifications,
}: {
  notifications: SerializedNotification[];
}) {
  const router = useRouter();
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function markAsRead(ids: string[]) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    router.refresh();
  }

  async function markAllAsRead() {
    setMarkingAll(true);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    setMarkingAll(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            &larr; Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Notifications
          </h1>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingAll}
            className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {markingAll ? "Marking..." : "Mark all as read"}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {notifications.map((notification) => {
              const style = TYPE_STYLES[notification.type] || {
                label: "Notification",
                className:
                  "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
              };

              const content = (
                <div className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="flex items-start gap-3">
                    {!notification.isRead && (
                      <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                    )}
                    {notification.isRead && <span className="w-2" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${style.className}`}
                        >
                          {style.label}
                        </span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">
                          {timeAgo(notification.createdAt)}
                        </span>
                      </div>
                      <p
                        className={`mt-1 text-sm ${
                          notification.isRead
                            ? "text-zinc-500 dark:text-zinc-400"
                            : "font-medium text-zinc-900 dark:text-zinc-50"
                        }`}
                      >
                        {notification.message}
                      </p>
                    </div>
                  </div>
                  {!notification.isRead && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        markAsRead([notification.id]);
                      }}
                      className="flex-shrink-0 text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              );

              if (notification.linkUrl) {
                return (
                  <li key={notification.id}>
                    <Link
                      href={notification.linkUrl}
                      className="block hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      {content}
                    </Link>
                  </li>
                );
              }

              return (
                <li
                  key={notification.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  {content}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
