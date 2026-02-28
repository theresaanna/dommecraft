"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  projectCount: number;
  createdAt: string;
};

export default function CategoriesPageClient({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/hub/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create category");
        return;
      }

      setNewCategoryName("");
      setShowForm(false);
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string, projectCount: number) {
    if (projectCount > 0) {
      alert(
        `Cannot delete "${name}" because it has ${projectCount} project(s). Move or delete projects first.`
      );
      return;
    }

    if (!confirm(`Delete category "${name}"?`)) {
      return;
    }

    const res = await fetch(`/api/hub/categories/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete category");
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/hub"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          &larr; Back to Hub
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Manage Categories
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {showForm ? "Cancel" : "New Category"}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          {error && (
            <p className="mb-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <button
              type="submit"
              disabled={submitting || !newCategoryName.trim()}
              className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {submitting ? "Creating..." : "Create"}
            </button>
          </form>
        </div>
      )}

      {initialCategories.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 p-8 text-center dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No categories yet. Visit the{" "}
            <Link
              href="/hub"
              className="text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              Hub
            </Link>{" "}
            to auto-create default categories, or create one above.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {initialCategories.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between px-4 py-4"
            >
              <div>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {category.name}
                </span>
                <span className="ml-2 text-sm text-zinc-500 dark:text-zinc-400">
                  ({category.projectCount}{" "}
                  {category.projectCount === 1 ? "project" : "projects"})
                </span>
              </div>
              <button
                onClick={() =>
                  handleDelete(
                    category.id,
                    category.name,
                    category.projectCount
                  )
                }
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
