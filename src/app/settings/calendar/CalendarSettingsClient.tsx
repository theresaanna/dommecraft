"use client";

import { useState } from "react";
import Link from "next/link";

type ExternalCalendarData = {
  id: string;
  provider: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
};

const PROVIDERS = [
  {
    id: "google",
    name: "Google Calendar",
    description: "Sync events to your Google Calendar account.",
  },
  {
    id: "apple",
    name: "Apple Calendar",
    description: "Sync events to your Apple Calendar via CalDAV.",
  },
];

export default function CalendarSettingsClient({
  calendars,
}: {
  calendars: ExternalCalendarData[];
}) {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function handleConnect(provider: string) {
    setSyncing(provider);
    setMessage("");
    try {
      const res = await fetch(`/api/calendar/sync/${provider}`, {
        method: "POST",
      });
      const data = await res.json();
      setMessage(data.message || "Sync initiated");
    } catch {
      setMessage("Failed to connect. Please try again.");
    } finally {
      setSyncing(null);
    }
  }

  function getCalendarForProvider(provider: string) {
    return calendars.find((c) => c.provider === provider);
  }

  return (
    <>
      <Link
        href="/settings"
        className="text-base text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
      >
        &larr; Settings
      </Link>
      <h1 className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
        Calendar Settings
      </h1>
      <p className="mt-1 text-base text-zinc-500 dark:text-zinc-400">
        Connect external calendars for one-way sync of your events.
      </p>

      {message && (
        <p className="mt-4 rounded-md bg-zinc-100 px-3 py-2 text-base text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {message}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {PROVIDERS.map((provider) => {
          const connected = getCalendarForProvider(provider.id);
          return (
            <div
              key={provider.id}
              className="rounded-lg border border-zinc-200 bg-white/40 backdrop-blur-sm p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {provider.name}
                  </h3>
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    {provider.description}
                  </p>
                </div>
                {connected ? (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    Connected
                  </span>
                ) : (
                  <button
                    onClick={() => handleConnect(provider.id)}
                    disabled={syncing === provider.id}
                    className="rounded-md bg-sky-300/30 backdrop-blur-sm border border-sky-400/30 px-3 py-1.5 text-sm font-medium text-sky-900 hover:bg-sky-300/45 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] transition-all disabled:opacity-50 dark:border-[rgba(55,113,200,0.35)] dark:bg-[rgba(55,113,200,0.25)] dark:text-blue-100 dark:hover:bg-[rgba(55,113,200,0.4)] dark:hover:shadow-[0_0_20px_rgba(55,113,200,0.5)]"
                  >
                    {syncing === provider.id ? "Connecting..." : "Connect"}
                  </button>
                )}
              </div>
              {connected && (
                <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {connected.lastSyncAt
                    ? `Last synced: ${new Date(connected.lastSyncAt).toLocaleString()}`
                    : "Not yet synced"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
