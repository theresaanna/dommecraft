"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import type { FilterParams } from "./TasksPageClient";

const STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Date Created" },
  { value: "deadline", label: "Deadline" },
  { value: "priority", label: "Priority" },
  { value: "title", label: "Title" },
];

type AvailableSub = {
  id: string;
  fullName: string;
};

type AvailableProject = {
  id: string;
  name: string;
};

export default function TasksFilters({
  currentParams,
  availableSubs,
  availableProjects,
}: {
  currentParams: FilterParams;
  availableSubs: AvailableSub[];
  availableProjects: AvailableProject[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [showFilters, setShowFilters] = useState(
    currentParams.status !== "" ||
      currentParams.priority !== "" ||
      currentParams.sub_id !== "" ||
      currentParams.project_id !== "" ||
      currentParams.deadline_from !== "" ||
      currentParams.deadline_to !== ""
  );

  function applyFilters(updates: Partial<FilterParams>) {
    const merged = { ...currentParams, ...updates };
    const params = new URLSearchParams();

    if (merged.status) params.set("status", merged.status);
    if (merged.priority) params.set("priority", merged.priority);
    if (merged.sub_id) params.set("sub_id", merged.sub_id);
    if (merged.project_id) params.set("project_id", merged.project_id);
    if (merged.deadline_from) params.set("deadline_from", merged.deadline_from);
    if (merged.deadline_to) params.set("deadline_to", merged.deadline_to);
    if (merged.sort !== "createdAt") params.set("sort", merged.sort);
    if (merged.order !== "desc") params.set("order", merged.order);

    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    router.push(pathname);
  }

  const hasActiveFilters =
    currentParams.status !== "" ||
    currentParams.priority !== "" ||
    currentParams.sub_id !== "" ||
    currentParams.project_id !== "" ||
    currentParams.deadline_from !== "" ||
    currentParams.deadline_to !== "";

  const filterCount =
    (currentParams.status ? 1 : 0) +
    (currentParams.priority ? 1 : 0) +
    (currentParams.sub_id ? 1 : 0) +
    (currentParams.project_id ? 1 : 0) +
    (currentParams.deadline_from ? 1 : 0) +
    (currentParams.deadline_to ? 1 : 0);

  return (
    <div className="mt-6 space-y-3">
      {/* Sort row */}
      <div className="flex gap-2">
        <select
          value={currentParams.sort}
          onChange={(e) => applyFilters({ sort: e.target.value })}
          aria-label="Sort by"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() =>
            applyFilters({
              order: currentParams.order === "asc" ? "desc" : "asc",
            })
          }
          aria-label={`Sort ${currentParams.order === "asc" ? "descending" : "ascending"}`}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {currentParams.order === "asc" ? "\u2191" : "\u2193"}
        </button>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          aria-label="Toggle filters"
          aria-expanded={showFilters}
          className={`rounded-md border px-3 py-2 text-sm font-medium ${
            hasActiveFilters
              ? "border-zinc-800 bg-zinc-800 text-zinc-50 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900"
              : "border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          Filters{hasActiveFilters ? ` (${filterCount})` : ""}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="space-y-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          {/* Status */}
          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Status
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    applyFilters({
                      status:
                        currentParams.status === opt.value ? "" : opt.value,
                    })
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    currentParams.status === opt.value
                      ? "bg-zinc-800 text-zinc-50 dark:bg-zinc-200 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Priority */}
          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Priority
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    applyFilters({
                      priority:
                        currentParams.priority === opt.value ? "" : opt.value,
                    })
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    currentParams.priority === opt.value
                      ? "bg-zinc-800 text-zinc-50 dark:bg-zinc-200 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Sub */}
          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Sub
            </legend>
            <select
              value={currentParams.sub_id}
              onChange={(e) => applyFilters({ sub_id: e.target.value })}
              aria-label="Filter by sub"
              className="mt-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">All</option>
              {availableSubs.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.fullName}
                </option>
              ))}
            </select>
          </fieldset>

          {/* Project */}
          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Project
            </legend>
            <select
              value={currentParams.project_id}
              onChange={(e) => applyFilters({ project_id: e.target.value })}
              aria-label="Filter by project"
              className="mt-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">All</option>
              {availableProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </fieldset>

          {/* Deadline range */}
          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Deadline Range
            </legend>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="date"
                aria-label="Deadline from"
                value={currentParams.deadline_from}
                onChange={(e) =>
                  applyFilters({ deadline_from: e.target.value })
                }
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <span className="text-sm text-zinc-400">&ndash;</span>
              <input
                type="date"
                aria-label="Deadline to"
                value={currentParams.deadline_to}
                onChange={(e) =>
                  applyFilters({ deadline_to: e.target.value })
                }
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
          </fieldset>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
