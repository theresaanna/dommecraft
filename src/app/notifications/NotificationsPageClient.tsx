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

const TYPE_STYLES: Record<
  string,
  { label: string; className: string; rowClassName: string }
> = {
  TASK_ASSIGNED: {
    label: "Task",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    rowClassName: "bg-blue-50/60 dark:bg-blue-950/20",
  },
  TASK_UPDATED: {
    label: "Update",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    rowClassName: "bg-amber-50/60 dark:bg-amber-950/20",
  },
  TASK_SUBMITTED: {
    label: "Submitted",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    rowClassName: "bg-amber-50/60 dark:bg-amber-950/20",
  },
  TASK_COMPLETED: {
    label: "Complete",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    rowClassName: "bg-emerald-50/60 dark:bg-emerald-950/20",
  },
  CALENDAR_REMINDER: {
    label: "Calendar",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    rowClassName: "bg-purple-50/60 dark:bg-purple-950/20",
  },
  SUB_JOINED: {
    label: "New Sub",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    rowClassName: "bg-green-50/60 dark:bg-green-950/20",
  },
  CHAT_MESSAGE: {
    label: "Message",
    className:
      "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    rowClassName: "bg-sky-50/60 dark:bg-sky-950/20",
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
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Notifications
          </h1>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingAll}
            className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {markingAll ? "Marking..." : "Mark all as read"}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="mt-8 text-center text-base text-zinc-500 dark:text-zinc-400">
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white/40 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {notifications.map((notification) => {
              const style = TYPE_STYLES[notification.type] || {
                label: "Notification",
                className:
                  "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                rowClassName: "bg-zinc-50/60 dark:bg-zinc-900/20",
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
                          className={`rounded-full px-2 py-0.5 text-sm ${style.className}`}
                        >
                          {style.label}
                        </span>
                        <span className="text-sm text-zinc-400 dark:text-zinc-500">
                          {timeAgo(notification.createdAt)}
                        </span>
                      </div>
                      <p
                        className={`mt-1 text-base ${
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
                      className="flex-shrink-0 text-sm text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              );

              if (notification.linkUrl) {
                return (
                  <li key={notification.id} className={style.rowClassName}>
                    <Link
                      href={notification.linkUrl}
                      className="block"
                    >
                      {content}
                    </Link>
                  </li>
                );
              }

              return (
                <li
                  key={notification.id}
                  className={style.rowClassName}
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
