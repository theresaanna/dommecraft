"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TasksFilters from "./TasksFilters";
import TasksList from "./TasksList";

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
  status: "PENDING" | "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED" | "ARCHIVED";
  declineReason: string | null;
  completedAt: string | null;
  createdAt: string;
  sub: { id: string; fullName: string; color: string | null };
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

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Tasks
          </h1>
          <p className="mt-1 text-base text-zinc-500 dark:text-zinc-400">
            Assign and track tasks for your subs.
          </p>
        </div>
        <Link
          href="/tasks/new"
          className="rounded-md bg-sky-300/30 backdrop-blur-sm border border-sky-400/30 px-4 py-2 text-base font-medium text-sky-900 hover:bg-sky-300/45 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] transition-all dark:border-[rgba(55,113,200,0.35)] dark:bg-[rgba(55,113,200,0.25)] dark:text-blue-100 dark:hover:bg-[rgba(55,113,200,0.4)] dark:hover:shadow-[0_0_20px_rgba(55,113,200,0.5)]"
        >
          New Sub Task
        </Link>
      </div>

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
