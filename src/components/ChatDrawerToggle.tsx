"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import ChatDrawer from "./ChatDrawer";

export default function ChatDrawerToggle() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  // Only render for authenticated users
  if (!session?.user?.id) return null;

  return (
    <>
      <button
        data-testid="chat-drawer-toggle"
        onClick={() => setOpen(true)}
        aria-label="Open chat list"
        className="fixed top-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
      </button>

      <ChatDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
