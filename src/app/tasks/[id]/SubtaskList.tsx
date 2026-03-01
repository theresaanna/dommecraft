"use client";

import { useRouter } from "next/navigation";

type Subtask = {
  id: string;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export default function SubtaskList({
  subtasks,
  taskId,
}: {
  subtasks: Subtask[];
  taskId: string;
}) {
  const router = useRouter();

  async function handleToggle(subtask: Subtask) {
    try {
      const res = await fetch(`/api/tasks/subtasks/${subtask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !subtask.isCompleted }),
      });

      if (res.ok) {
        router.refresh();
      }
    } catch {
      // Silently fail; user can retry
    }
  }

  async function handleDelete(subtaskId: string) {
    try {
      const res = await fetch(`/api/tasks/subtasks/${subtaskId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      }
    } catch {
      // Silently fail; user can retry
    }
  }

  if (subtasks.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No subtasks yet.
      </p>
    );
  }

  // Suppress unused variable warning - taskId is kept for prop consistency
  void taskId;

  return (
    <ul className="space-y-2">
      {subtasks.map((subtask) => (
        <li
          key={subtask.id}
          className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
        >
          <input
            type="checkbox"
            checked={subtask.isCompleted}
            onChange={() => handleToggle(subtask)}
            className="rounded border-zinc-300 dark:border-zinc-600"
          />
          <span
            className={`flex-1 text-sm ${
              subtask.isCompleted
                ? "text-zinc-400 line-through dark:text-zinc-500"
                : "text-zinc-900 dark:text-zinc-50"
            }`}
          >
            {subtask.title}
          </span>
          <button
            onClick={() => handleDelete(subtask.id)}
            className="text-sm text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400"
            aria-label={`Delete subtask: ${subtask.title}`}
          >
            &times;
          </button>
        </li>
      ))}
    </ul>
  );
}
