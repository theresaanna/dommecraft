"use client";

import { useState } from "react";

type Note = {
  id: string;
  title: string | null;
  content: string;
  reminderAt: string | null;
};

export default function NoteForm({
  projectId,
  note,
  onClose,
}: {
  projectId: string;
  note?: Note;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!note;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const content = form.get("content") as string;

    if (!content || content.trim() === "") {
      setError("Note content is required");
      setSubmitting(false);
      return;
    }

    const body = {
      title: (form.get("title") as string) || null,
      content: content.trim(),
      reminderAt: (form.get("reminderAt") as string) || null,
    };

    try {
      const url = isEditing
        ? `/api/hub/notes/${note.id}`
        : `/api/hub/projects/${projectId}/notes`;
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save note");
        return;
      }

      onClose();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
        {isEditing ? "Edit Note" : "New Note"}
      </h3>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Title (optional)
          </label>
          <input
            type="text"
            id="title"
            name="title"
            defaultValue={note?.title || ""}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div>
          <label
            htmlFor="content"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Content *
          </label>
          <textarea
            id="content"
            name="content"
            rows={6}
            defaultValue={note?.content || ""}
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div>
          <label
            htmlFor="reminderAt"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Reminder Date (optional)
          </label>
          <input
            type="date"
            id="reminderAt"
            name="reminderAt"
            defaultValue={
              note?.reminderAt
                ? new Date(note.reminderAt).toISOString().split("T")[0]
                : ""
            }
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {submitting ? "Saving..." : isEditing ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
