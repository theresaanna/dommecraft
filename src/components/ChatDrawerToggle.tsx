"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useUnreadChats } from "@/components/providers/notification-provider";
import ChatDrawer from "./ChatDrawer";

export default function ChatDrawerToggle() {
  const { data: session } = useSession();
  const { unreadChatCount } = useUnreadChats();
  const [open, setOpen] = useState(false);

  // Only render for authenticated users
  if (!session?.user?.id) return null;

  return (
    <>
      <button
        data-testid="chat-drawer-toggle"
        onClick={() => setOpen(true)}
        aria-label="Open chat list"
        className={`fixed top-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-md ${
          unreadChatCount > 0
            ? "text-amber-500 hover:bg-amber-50 hover:text-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:hover:text-amber-300"
            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-6 w-6"
        >
          <path
            fillRule="evenodd"
            d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM3 12a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z"
            clipRule="evenodd"
          />
        </svg>
        {unreadChatCount > 0 && (
          <span
            data-testid="unread-chat-badge"
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold text-white"
          >
            {unreadChatCount > 9 ? "9+" : unreadChatCount}
          </span>
        )}
      </button>

      <ChatDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
