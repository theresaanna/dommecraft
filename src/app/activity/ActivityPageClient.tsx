"use client";

import Link from "next/link";

type ActivityItem = {
  id: string;
  type: "financial" | "task" | "note";
  title: string;
  subtitle: string | null;
  amount: string | null;
  href: string;
  date: string;
};

const TYPE_STYLES: Record<
  string,
  { label: string; className: string }
> = {
  financial: {
    label: "Financial",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  task: {
    label: "Task Done",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  note: {
    label: "Note",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
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

export default function ActivityPageClient({
  items,
}: {
  items: ActivityItem[];
}) {
  return (
    <>
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          &larr; Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Activity
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <p>No activity yet.</p>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((item) => {
              const style = TYPE_STYLES[item.type];
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${style.className}`}
                      >
                        {style.label}
                      </span>
                      <span className="text-sm text-zinc-900 dark:text-zinc-50">
                        {item.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.amount && (
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {item.amount}
                        </span>
                      )}
                      {item.subtitle && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {item.subtitle}
                        </span>
                      )}
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {timeAgo(item.date)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
