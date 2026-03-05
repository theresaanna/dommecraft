"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LexicalEditor from "@/components/LexicalEditor";

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
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState(note?.content || "");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/hub/projects")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProjects(
            data.map((p: { id: string; name: string }) => ({
              id: p.id,
              name: p.name,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const isEditing = !!note;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(e.currentTarget);

    // Check if content is empty (Lexical produces <p><br></p> for empty editor)
    const strippedContent = content
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();

    if (!strippedContent) {
      setError("Note content is required");
      setSubmitting(false);
      return;
    }

    const body = {
      title: (form.get("title") as string) || null,
      content,
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
    <div className="rounded-lg border border-zinc-200 bg-white/40 backdrop-blur-sm p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
      <h3 className="text-xl font-medium text-zinc-900 dark:text-zinc-50">
        {isEditing ? "Edit Note" : "New Note"}
      </h3>

      {error && (
        <p className="mt-2 text-base text-red-600 dark:text-red-400">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="title"
            className="block text-base font-medium text-zinc-700 dark:text-zinc-300"
          >
            Title (optional)
          </label>
          <input
            type="text"
            id="title"
            name="title"
            defaultValue={note?.title || ""}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div>
          <label className="block text-base font-medium text-zinc-700 dark:text-zinc-300">
            Content *
          </label>
          <div className="mt-1">
            <LexicalEditor
              initialContent={note?.content}
              onChange={setContent}
              contextMenuConfig={{
                projectId,
                projects,
                onTaskCreated: () => router.refresh(),
              }}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="reminderAt"
            className="block text-base font-medium text-zinc-700 dark:text-zinc-300"
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
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-300 px-4 py-2 text-base font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-sky-300/30 backdrop-blur-sm border border-sky-400/30 px-4 py-2 text-base font-medium text-sky-900 hover:bg-sky-300/45 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] transition-all disabled:opacity-50 dark:border-[rgba(55,113,200,0.35)] dark:bg-[rgba(55,113,200,0.25)] dark:text-blue-100 dark:hover:bg-[rgba(55,113,200,0.4)] dark:hover:shadow-[0_0_20px_rgba(55,113,200,0.5)]"
          >
            {submitting ? "Saving..." : isEditing ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
