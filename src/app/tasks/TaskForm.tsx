"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TagInput from "@/components/TagInput";

type AvailableSub = {
  id: string;
  fullName: string;
};

type AvailableProject = {
  id: string;
  name: string;
};

type TaskData = {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  deadline: string | null;
  tags: string[];
  subId?: string;
  projectId?: string | null;
};

export default function TaskForm({
  availableSubs,
  availableProjects,
  onClose,
  task,
}: {
  availableSubs: AvailableSub[];
  availableProjects: AvailableProject[];
  onClose: () => void;
  task?: TaskData;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tags, setTags] = useState<string[]>(task?.tags ?? []);

  const isEditing = !!task;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const title = (form.get("title") as string)?.trim();

    if (!title) {
      setError("Title is required");
      setSubmitting(false);
      return;
    }

    if (!isEditing) {
      const subId = form.get("subId") as string;
      if (!subId) {
        setError("Sub is required");
        setSubmitting(false);
        return;
      }
    }

    const deadlineValue = form.get("deadline") as string;

    const body: Record<string, unknown> = {
      title,
      description: (form.get("description") as string) || null,
      priority: form.get("priority") as string,
      projectId: (form.get("projectId") as string) || null,
      deadline: deadlineValue || null,
      tags,
    };

    if (!isEditing) {
      body.subId = form.get("subId") as string;
    }

    try {
      const url = isEditing ? `/api/tasks/${task.id}` : "/api/tasks";
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save task");
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
        {isEditing ? "Edit Task" : "New Task"}
      </h3>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            defaultValue={task?.title || ""}
            required
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        {/* Description */}
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
            rows={3}
            defaultValue={task?.description || ""}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Sub (not shown when editing) */}
          {!isEditing && (
            <div>
              <label
                htmlFor="subId"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Sub *
              </label>
              <select
                id="subId"
                name="subId"
                required
                defaultValue=""
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              >
                <option value="">Select a sub...</option>
                {availableSubs.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Priority */}
          <div>
            <label
              htmlFor="priority"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              defaultValue={task?.priority || "MEDIUM"}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Project */}
          <div>
            <label
              htmlFor="projectId"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Project
            </label>
            <select
              id="projectId"
              name="projectId"
              defaultValue={task?.projectId || ""}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">None</option>
              {availableProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Deadline */}
          <div>
            <label
              htmlFor="deadline"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Deadline
            </label>
            <input
              type="datetime-local"
              id="deadline"
              name="deadline"
              defaultValue={
                task?.deadline
                  ? new Date(task.deadline).toISOString().slice(0, 16)
                  : ""
              }
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
        </div>

        {/* Tags */}
        <TagInput
          label="Tags"
          name="tags"
          placeholder="Add tags..."
          value={tags}
          onChange={setTags}
        />

        {/* Actions */}
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
            {submitting
              ? "Saving..."
              : isEditing
                ? "Update Task"
                : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}
