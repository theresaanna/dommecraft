"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubtaskForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });

      if (res.ok) {
        setTitle("");
        router.refresh();
      }
    } catch {
      // Silently fail; user can retry
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a subtask..."
        className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      <button
        type="submit"
        disabled={submitting || !title.trim()}
        className="rounded-md bg-sky-300/30 backdrop-blur-sm border border-sky-400/30 px-4 py-2 text-base font-medium text-sky-900 hover:bg-sky-300/45 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] transition-all disabled:opacity-50 dark:border-[rgba(55,113,200,0.35)] dark:bg-[rgba(55,113,200,0.25)] dark:text-blue-100 dark:hover:bg-[rgba(55,113,200,0.4)] dark:hover:shadow-[0_0_20px_rgba(55,113,200,0.5)]"
      >
        Add
      </button>
    </form>
  );
}
