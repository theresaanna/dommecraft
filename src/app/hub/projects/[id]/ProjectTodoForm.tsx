"use client";

import { useState } from "react";

export default function ProjectTodoForm({
  projectId,
  onCreated,
}: {
  projectId: string;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/hub/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          deadline: deadline || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add todo");
        return;
      }

      setTitle("");
      setDeadline("");
      onCreated();
    } catch {
      setError("Failed to add todo");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1">
        <label
          htmlFor="todo-title"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Todo
        </label>
        <input
          id="todo-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />
      </div>
      <div>
        <label
          htmlFor="todo-deadline"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Deadline
        </label>
        <input
          id="todo-deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <button
        type="submit"
        disabled={submitting || !title.trim()}
        className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {submitting ? "Adding..." : "Add"}
      </button>
      {error && (
        <span className="text-sm text-red-500 dark:text-red-400">{error}</span>
      )}
    </form>
  );
}
