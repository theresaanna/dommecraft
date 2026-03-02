"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type ToastProps = {
  id: string;
  message: string;
  linkUrl: string | null;
  type: string;
  onDismiss: () => void;
};

export default function Toast({ message, linkUrl, type, onDismiss }: ToastProps) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const typeLabel = TYPE_LABELS[type] || "Notification";

  return (
    <div
      onClick={() => {
        if (linkUrl) {
          router.push(linkUrl);
        }
        onDismiss();
      }}
      className="relative w-80 animate-slide-in cursor-pointer rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
      role="alert"
    >
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {typeLabel}
      </p>
      <p className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">
        {message}
      </p>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        aria-label="Dismiss notification"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  TASK_ASSIGNED: "New Task",
  TASK_UPDATED: "Task Updated",
  TASK_SUBMITTED: "Task Submitted",
  TASK_COMPLETED: "Task Completed",
  CALENDAR_REMINDER: "Calendar",
  SUB_JOINED: "New Sub",
  FRIEND_REQUEST: "Friend Request",
  FRIEND_ACCEPTED: "Friend Accepted",
};
