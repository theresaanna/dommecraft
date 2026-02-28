"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CategorySidebar from "./CategorySidebar";
import ProjectList from "./ProjectList";
import ProjectForm from "./ProjectForm";

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  projectCount: number;
  createdAt: string;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  category: { id: string; name: string };
  notesCount: number;
  createdAt: string;
  updatedAt: string;
};

export default function HubPageClient({
  initialCategories,
  initialProjects,
}: {
  initialCategories: Category[];
  initialProjects: Project[];
}) {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initialCategories[0]?.id || null
  );
  const [showProjectForm, setShowProjectForm] = useState(false);

  const filteredProjects = selectedCategoryId
    ? initialProjects.filter((p) => p.categoryId === selectedCategoryId)
    : initialProjects;

  const selectedCategory = initialCategories.find(
    (c) => c.id === selectedCategoryId
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Creation Hub
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Organize your ideas, plans, and notes
          </p>
        </div>
        <Link
          href="/hub/categories"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          Manage Categories
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <CategorySidebar
            categories={initialCategories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
          />
        </div>

        <div className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {selectedCategory?.name || "All Projects"}
            </h2>
            <button
              onClick={() => setShowProjectForm(!showProjectForm)}
              disabled={!selectedCategoryId}
              className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {showProjectForm ? "Cancel" : "New Project"}
            </button>
          </div>

          {showProjectForm && selectedCategoryId && (
            <div className="mb-4">
              <ProjectForm
                categoryId={selectedCategoryId}
                onClose={() => {
                  setShowProjectForm(false);
                  router.refresh();
                }}
              />
            </div>
          )}

          <ProjectList projects={filteredProjects} />
        </div>
      </div>
    </div>
  );
}
