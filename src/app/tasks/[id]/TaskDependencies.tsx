"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AvailableTask = {
  id: string;
  title: string;
  status: string;
};

type Dependency = {
  id: string;
  dependsOn: { id: string; title: string; status: string };
};

type DependedOnBy = {
  id: string;
  task: { id: string; title: string; status: string };
};

const STATUS_STYLES: Record<string, string> = {
  NOT_STARTED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  IN_PROGRESS:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SUBMITTED:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  COMPLETED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  ARCHIVED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
};

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export default function TaskDependencies({
  dependsOn,
  dependedOnBy,
  availableTasks,
  taskId,
}: {
  dependsOn: Dependency[];
  dependedOnBy: DependedOnBy[];
  availableTasks: AvailableTask[];
  taskId: string;
}) {
  const router = useRouter();
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [adding, setAdding] = useState(false);

  // Filter out tasks that are already dependencies
  const existingDepIds = new Set(dependsOn.map((d) => d.dependsOn.id));
  const filteredTasks = availableTasks.filter(
    (t) => !existingDepIds.has(t.id)
  );

  async function handleRemoveDependency(depId: string) {
    try {
      const res = await fetch(
        `/api/tasks/${taskId}/dependencies/${depId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        router.refresh();
      }
    } catch {
      // Silently fail; user can retry
    }
  }

  async function handleAddDependency(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedTaskId) return;

    setAdding(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dependsOnTaskId: selectedTaskId }),
      });

      if (res.ok) {
        setSelectedTaskId("");
        router.refresh();
      }
    } catch {
      // Silently fail; user can retry
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Blocked By (dependsOn) */}
      <div>
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Blocked By
        </h3>
        {dependsOn.length === 0 ? (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            No blocking dependencies.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {dependsOn.map((dep) => (
              <li
                key={dep.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <Link
                  href={`/tasks/${dep.dependsOn.id}`}
                  className="flex-1 text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                >
                  {dep.dependsOn.title}
                </Link>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[dep.dependsOn.status] || ""}`}
                >
                  {STATUS_LABELS[dep.dependsOn.status] || dep.dependsOn.status}
                </span>
                <button
                  onClick={() => handleRemoveDependency(dep.id)}
                  className="text-sm text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400"
                  aria-label={`Remove dependency: ${dep.dependsOn.title}`}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Blocks (dependedOnBy) */}
      <div>
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Blocks
        </h3>
        {dependedOnBy.length === 0 ? (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            No tasks depend on this task.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {dependedOnBy.map((dep) => (
              <li
                key={dep.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <Link
                  href={`/tasks/${dep.task.id}`}
                  className="flex-1 text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                >
                  {dep.task.title}
                </Link>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[dep.task.status] || ""}`}
                >
                  {STATUS_LABELS[dep.task.status] || dep.task.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add Dependency */}
      {filteredTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Add Dependency
          </h3>
          <form onSubmit={handleAddDependency} className="mt-2 flex gap-2">
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">Select a task...</option>
              {filteredTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={adding || !selectedTaskId}
              className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
