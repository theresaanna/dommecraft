"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TasksFilters from "./TasksFilters";
import TasksList from "./TasksList";
import TaskForm from "./TaskForm";

type AvailableSub = {
  id: string;
  fullName: string;
};

type AvailableProject = {
  id: string;
  name: string;
};

export type SerializedTask = {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  deadline: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED" | "ARCHIVED";
  completedAt: string | null;
  createdAt: string;
  sub: { id: string; fullName: string };
  project: { id: string; name: string } | null;
  _count: { subtasks: number; proofs: number };
  subtasks: { isCompleted: boolean }[];
};

export type FilterParams = {
  status: string;
  priority: string;
  sub_id: string;
  project_id: string;
  deadline_from: string;
  deadline_to: string;
  sort: string;
  order: string;
};

export default function TasksPageClient({
  initialTasks,
  availableSubs,
  availableProjects,
  currentParams,
}: {
  initialTasks: SerializedTask[];
  availableSubs: AvailableSub[];
  availableProjects: AvailableProject[];
  currentParams: FilterParams;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  function handleToggleSelect(id: string) {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSelectAll() {
    if (selectedTasks.size === initialTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(initialTasks.map((t) => t.id)));
    }
  }

  async function handleBulkAction(action: "complete" | "archive" | "delete") {
    if (selectedTasks.size === 0) return;

    if (
      action === "delete" &&
      !confirm(
        `Delete ${selectedTasks.size} task${selectedTasks.size > 1 ? "s" : ""}? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          taskIds: [...selectedTasks],
        }),
      });

      if (res.ok) {
        setSelectedTasks(new Set());
        router.refresh();
      }
    } catch {
      // Silently fail; user can retry
    }
  }

  function handleFormClose() {
    setShowForm(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            &larr; Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Tasks
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Assign and track tasks for your subs.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {showForm ? "Cancel" : "New Task"}
        </button>
      </div>

      {showForm && (
        <div className="mt-4">
          <TaskForm
            availableSubs={availableSubs}
            availableProjects={availableProjects}
            onClose={handleFormClose}
          />
        </div>
      )}

      <TasksFilters
        currentParams={currentParams}
        availableSubs={availableSubs}
        availableProjects={availableProjects}
      />

      <TasksList
        tasks={initialTasks}
        selectedTasks={selectedTasks}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onBulkAction={handleBulkAction}
      />
    </>
  );
}
