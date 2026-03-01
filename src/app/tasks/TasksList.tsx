"use client";

import Link from "next/link";
import type { SerializedTask } from "./TasksPageClient";

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  MEDIUM:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  HIGH: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_STYLES: Record<string, string> = {
  NOT_STARTED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  IN_PROGRESS:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SUBMITTED:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  COMPLETED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  ARCHIVED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
};

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

function formatDeadline(deadline: string): string {
  return new Date(deadline).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TasksList({
  tasks,
  selectedTasks,
  onToggleSelect,
  onSelectAll,
  onBulkAction,
}: {
  tasks: SerializedTask[];
  selectedTasks: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onBulkAction: (action: "complete" | "archive" | "delete") => void;
}) {
  if (tasks.length === 0) {
    return (
      <p className="mt-8 text-center text-zinc-500 dark:text-zinc-400">
        No tasks yet. Assign your first task to a sub.
      </p>
    );
  }

  const completedSubtasks = (subtasks: { isCompleted: boolean }[]) =>
    subtasks.filter((s) => s.isCompleted).length;

  return (
    <>
      {/* Bulk action bar */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={onSelectAll}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {selectedTasks.size === tasks.length ? "Deselect All" : "Select All"}
        </button>

        {selectedTasks.size > 0 && (
          <>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {selectedTasks.size} selected
            </span>

            <button
              onClick={() => onBulkAction("complete")}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Mark Complete
            </button>

            <button
              onClick={() => onBulkAction("archive")}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Archive
            </button>

            <button
              onClick={() => onBulkAction("delete")}
              className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
          </>
        )}
      </div>

      {/* Task list */}
      <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
        {tasks.map((task) => {
          const overdue =
            isOverdue(task.deadline) &&
            task.status !== "COMPLETED" &&
            task.status !== "ARCHIVED";
          const completed = completedSubtasks(task.subtasks);
          const total = task._count.subtasks;

          return (
            <li
              key={task.id}
              className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
            >
              <input
                type="checkbox"
                checked={selectedTasks.has(task.id)}
                onChange={() => onToggleSelect(task.id)}
                className="mt-1 rounded border-zinc-300 dark:border-zinc-600"
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                  >
                    {task.title}
                  </Link>

                  {/* Sub badge */}
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {task.sub.fullName}
                  </span>

                  {/* Priority badge */}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}
                  >
                    {task.priority}
                  </span>

                  {/* Status badge */}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}
                  >
                    {STATUS_LABELS[task.status]}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                  {/* Deadline */}
                  {task.deadline && (
                    <span className={overdue ? "font-medium text-red-600 dark:text-red-400" : ""}>
                      Due {formatDeadline(task.deadline)}
                      {overdue && " (overdue)"}
                    </span>
                  )}

                  {/* Subtask progress */}
                  {total > 0 && (
                    <span>
                      {completed}/{total} subtasks
                    </span>
                  )}

                  {/* Proof count */}
                  {task._count.proofs > 0 && (
                    <span>
                      {task._count.proofs} proof{task._count.proofs !== 1 ? "s" : ""}
                    </span>
                  )}

                  {/* Project */}
                  {task.project && (
                    <span>&middot; {task.project.name}</span>
                  )}

                  {/* Tags */}
                  {task.tags.length > 0 && (
                    <span className="flex gap-1">
                      {task.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
