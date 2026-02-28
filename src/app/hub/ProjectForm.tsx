"use client";

import { useState } from "react";

export default function ProjectForm({
  categoryId,
  project,
  onClose,
}: {
  categoryId: string;
  project?: {
    id: string;
    name: string;
    description: string | null;
  };
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!project;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;

    if (!name || name.trim() === "") {
      setError("Project name is required");
      setSubmitting(false);
      return;
    }

    const body = {
      name: name.trim(),
      description: (form.get("description") as string) || null,
      categoryId,
    };

    try {
      const url = isEditing
        ? `/api/hub/projects/${project.id}`
        : "/api/hub/projects";
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save project");
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
        {isEditing ? "Edit Project" : "New Project"}
      </h3>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Project Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            defaultValue={project?.name || ""}
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={project?.description || ""}
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
