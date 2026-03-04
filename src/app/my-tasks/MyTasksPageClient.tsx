"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type SerializedTask = {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED" | "ARCHIVED";
  declineReason: string | null;
  deadline: string | null;
  tags: string[];
  sub: { id: string; fullName: string };
  subtaskCount: number;
  proofCount: number;
  completedSubtasks: number;
  createdAt: string;
};

type FilterTab = "pending" | "active" | "submitted" | "completed" | "all";

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  MEDIUM:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  HIGH: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  NOT_STARTED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  IN_PROGRESS:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SUBMITTED:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  COMPLETED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending Request",
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
};

function isOverdue(deadline: string | null, status: string): boolean {
  if (!deadline) return false;
  if (status === "COMPLETED" || status === "ARCHIVED") return false;
  return new Date(deadline) < new Date();
}

function formatDeadline(deadline: string): string {
  return new Date(deadline).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const TABS: { key: FilterTab; label: string }[] = [
  { key: "pending", label: "Requests" },
  { key: "active", label: "Active" },
  { key: "submitted", label: "Submitted" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All" },
];

function filterTasks(tasks: SerializedTask[], tab: FilterTab): SerializedTask[] {
  switch (tab) {
    case "pending":
      return tasks.filter((t) => t.status === "PENDING" && !t.declineReason);
    case "active":
      return tasks.filter(
        (t) => t.status === "NOT_STARTED" || t.status === "IN_PROGRESS"
      );
    case "submitted":
      return tasks.filter((t) => t.status === "SUBMITTED");
    case "completed":
      return tasks.filter((t) => t.status === "COMPLETED");
    case "all":
      return tasks;
  }
}

type ApiTask = {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED" | "ARCHIVED";
  declineReason: string | null;
  deadline: string | null;
  tags: string[];
  sub: { id: string; fullName: string };
  _count: { subtasks: number; proofs: number };
  subtasks: { isCompleted: boolean }[];
  createdAt: string;
};

function serializeApiTasks(apiTasks: ApiTask[]): SerializedTask[] {
  return apiTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    declineReason: t.declineReason,
    deadline: t.deadline,
    tags: t.tags,
    sub: t.sub,
    subtaskCount: t._count.subtasks,
    proofCount: t._count.proofs,
    completedSubtasks: t.subtasks.filter((s) => s.isCompleted).length,
    createdAt: t.createdAt,
  }));
}

export default function MyTasksPageClient({
  tasks: initialTasks,
  hasLinkedProfile,
  title = "My Tasks",
  subtitle = "Assigned tasks from your Domme",
  basePath = "/my-tasks",
}: {
  tasks: SerializedTask[];
  hasLinkedProfile: boolean;
  title?: string;
  subtitle?: string;
  basePath?: string;
}) {
  const [tasks, setTasks] = useState<SerializedTask[]>(initialTasks);
  const hasPending = tasks.some((t) => t.status === "PENDING");
  const [activeTab, setActiveTab] = useState<FilterTab>(hasPending ? "pending" : "active");

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/my-tasks");
      if (!res.ok) return;
      const data: ApiTask[] = await res.json();
      setTasks(serializeApiTasks(data));
    } catch {
      // Silently ignore fetch errors
    }
  }, []);

  useEffect(() => {
    // Fetch fresh data on mount (e.g. navigating back from detail page)
    fetchTasks();

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        fetchTasks();
      }
    }

    function handleRefresh() {
      fetchTasks();
    }

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("notifications:refresh", handleRefresh);

    // Poll every 30 seconds for new tasks
    const interval = setInterval(fetchTasks, 30_000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("notifications:refresh", handleRefresh);
      clearInterval(interval);
    };
  }, [fetchTasks]);

  if (!hasLinkedProfile) {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        <p className="mt-4 text-base text-zinc-700 dark:text-zinc-300">
          Your account is not linked to any profile yet. Ask your Domme for an
          invite code, then enter it on the Link Account page.
        </p>
        <Link
          href="/link"
          className="mt-4 inline-block rounded-md bg-zinc-800 px-4 py-2 text-base font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Link Account
        </Link>
      </div>
    );
  }

  const filtered = filterTasks(tasks, activeTab);

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        <p className="mt-1 text-base text-zinc-500 dark:text-zinc-400">
          {subtitle}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="mt-6 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map((tab) => {
          const count = filterTasks(tasks, tab.key).length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-base font-medium transition-colors ${
                isActive
                  ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 text-sm text-zinc-400 dark:text-zinc-500">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <p className="mt-8 text-center text-base text-zinc-500 dark:text-zinc-400">
          No tasks in this category.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
          {filtered.map((task) => {
            const overdue = isOverdue(task.deadline, task.status);
            return (
              <li key={task.id}>
                <Link
                  href={`${basePath}/${task.id}`}
                  className="block px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {task.title}
                    </span>

                    {/* Priority badge */}
                    <span
                      className={`rounded-full px-2 py-0.5 text-sm font-medium ${PRIORITY_STYLES[task.priority]}`}
                    >
                      {task.priority}
                    </span>

                    {/* Status badge */}
                    <span
                      className={`rounded-full px-2 py-0.5 text-sm font-medium ${
                        task.status === "PENDING" && task.declineReason
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : STATUS_STYLES[task.status]
                      }`}
                    >
                      {task.status === "PENDING" && task.declineReason
                        ? "Declined"
                        : STATUS_LABELS[task.status]}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-base text-zinc-500 dark:text-zinc-400">
                    {/* Deadline */}
                    {task.deadline && (
                      <span
                        className={
                          overdue
                            ? "font-medium text-red-600 dark:text-red-400"
                            : ""
                        }
                      >
                        Due {formatDeadline(task.deadline)}
                        {overdue && " (overdue)"}
                      </span>
                    )}

                    {/* Subtask progress */}
                    {task.subtaskCount > 0 && (
                      <span>
                        {task.completedSubtasks}/{task.subtaskCount} subtasks
                      </span>
                    )}

                    {/* Proof count */}
                    {task.proofCount > 0 && (
                      <span>
                        {task.proofCount} proof
                        {task.proofCount !== 1 ? "s" : ""}
                      </span>
                    )}

                    {/* Tags */}
                    {task.tags.length > 0 && (
                      <span className="flex gap-1">
                        {task.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-zinc-100 px-2 py-0.5 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
