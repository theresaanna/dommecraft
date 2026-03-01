"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "bookmark-banner-dismissed";

function getBookmarkInstructions(): string {
  if (typeof navigator === "undefined") return "";

  const ua = navigator.userAgent;

  if (/iPad|iPhone|iPod/.test(ua)) {
    return "Tap the Share button, then \"Add to Home Screen\" to save this app.";
  }
  if (/Android/.test(ua)) {
    return "Tap the menu button, then \"Add to Home screen\" to save this app.";
  }
  if (/Mac/.test(ua)) {
    return "Press \u2318D to bookmark this page for quick access.";
  }
  return "Press Ctrl+D to bookmark this page for quick access.";
}

export default function BookmarkBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex items-center justify-between bg-zinc-100 px-4 py-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
      <span>{getBookmarkInstructions()}</span>
      <button
        type="button"
        onClick={handleDismiss}
        className="ml-4 shrink-0 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
