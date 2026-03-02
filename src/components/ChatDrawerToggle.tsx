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
        className="fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-6 w-6"
        >
          <path
            fillRule="evenodd"
            d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <ChatDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
