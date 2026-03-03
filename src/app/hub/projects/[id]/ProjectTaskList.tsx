"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProjectTask = {
  id: string;
  title: string;
  completed: boolean;
  deadline: string | null;
  sortOrder: number;
  calendarEventId: string | null;
  createdAt: string;
  updatedAt: string;
};

function formatDeadline(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProjectTaskList({
  tasks,
}: {
  tasks: ProjectTask[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleToggle(task: ProjectTask) {
    await fetch(`/api/hub/projects/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    router.refresh();
  }

  async function handleDelete(task: ProjectTask) {
    if (!confirm(`Delete task "${task.title}"?`)) return;

    await fetch(`/api/hub/projects/tasks/${task.id}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  function startEdit(task: ProjectTask) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDeadline(
      task.deadline
        ? new Date(task.deadline).toISOString().split("T")[0]
        : ""
    );
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError("");
  }

  async function handleSaveEdit(taskId: string) {
    if (!editTitle.trim()) {
      setEditError("Title is required");
      return;
    }
    setSaving(true);
    setEditError("");
    try {
      const res = await fetch(`/api/hub/projects/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          deadline: editDeadline || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error || "Failed to update task");
        return;
      }
      setEditingId(null);
      router.refresh();
    } catch {
      setEditError("Failed to update task");
    } finally {
      setSaving(false);
    }
  }

  if (tasks.length === 0) {
    return (
      <p className="py-4 text-sm text-zinc-500 dark:text-zinc-400">
        No tasks yet. Add one above.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex items-center gap-3 py-2"
        >
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => handleToggle(task)}
            className="h-4 w-4 shrink-0 rounded border-zinc-300 text-zinc-800 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800"
            aria-label={`Mark "${task.title}" as ${task.completed ? "incomplete" : "complete"}`}
          />
          {editingId === task.id ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  aria-label={`Edit title for "${task.title}"`}
                />
              </div>
              <input
                type="date"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                className="rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                aria-label="Deadline"
              />
              <button
                onClick={() => handleSaveEdit(task.id)}
                disabled={saving}
                className="rounded-md bg-zinc-800 px-3 py-1 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={cancelEdit}
                className="rounded-md border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              {editError && (
                <span className="w-full text-sm text-red-500 dark:text-red-400">
                  {editError}
                </span>
              )}
            </div>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <span
                  className={`text-sm ${
                    task.completed
                      ? "text-zinc-400 line-through dark:text-zinc-500"
                      : "text-zinc-900 dark:text-zinc-50"
                  }`}
                >
                  {task.title}
                </span>
                {task.deadline && (
                  <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">
                    {formatDeadline(task.deadline)}
                  </span>
                )}
              </div>
              <button
                onClick={() => startEdit(task)}
                className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                aria-label={`Edit "${task.title}"`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                  <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25h5.5a.75.75 0 0 0 0-1.5h-5.5A2.75 2.75 0 0 0 2 5.75v8.5A2.75 2.75 0 0 0 4.75 17h8.5A2.75 2.75 0 0 0 16 14.25v-5.5a.75.75 0 0 0-1.5 0v5.5c0 .69-.56 1.25-1.25 1.25h-8.5c-.69 0-1.25-.56-1.25-1.25v-8.5Z" />
                </svg>
              </button>
              <button
                onClick={() => handleDelete(task)}
                className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                aria-label={`Delete "${task.title}"`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
