"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { triggerNotificationRefresh } from "@/components/providers/notification-provider";
import TaskForm from "../TaskForm";
import SubtaskList from "./SubtaskList";
import SubtaskForm from "./SubtaskForm";
import TaskProofs from "./TaskProofs";
import TaskDependencies from "./TaskDependencies";

type AvailableProject = {
  id: string;
  name: string;
};

type AvailableTask = {
  id: string;
  title: string;
  status: string;
};

type Subtask = {
  id: string;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type Proof = {
  id: string;
  fileUrl: string;
  fileType: string;
  mimeType: string | null;
  fileSize: number | null;
  notes: string | null;
  createdAt: string;
};

type Dependency = {
  id: string;
  dependsOn: { id: string; title: string; status: string };
};

type DependedOnBy = {
  id: string;
  task: { id: string; title: string; status: string };
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  deadline: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED" | "ARCHIVED";
  completedAt: string | null;
  recurrenceRule: string | null;
  recurrenceEndDate: string | null;
  reminderOffset: number | null;
  createdAt: string;
  updatedAt: string;
  sub: { id: string; fullName: string };
  project: { id: string; name: string } | null;
  subtasks: Subtask[];
  proofs: Proof[];
  dependsOn: Dependency[];
  dependedOnBy: DependedOnBy[];
};

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isOverdue(deadline: string | null, status: string): boolean {
  if (!deadline) return false;
  if (status === "COMPLETED" || status === "ARCHIVED") return false;
  return new Date(deadline) < new Date();
}

export default function TaskDetailClient({
  task,
  availableTasks,
  availableProjects,
}: {
  task: Task;
  availableTasks: AvailableTask[];
  availableProjects: AvailableProject[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Delete task "${task.title}"? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/tasks");
        router.refresh();
      }
    } catch {
      // Silently fail; user can retry
    }
  }

  async function handleStatusChange(newStatus: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        triggerNotificationRefresh();
        router.refresh();
      }
    } catch {
      // Silently fail; user can retry
    } finally {
      setActionLoading(false);
    }
  }

  const overdue = isOverdue(task.deadline, task.status);

  if (editing) {
    return (
      <div>
        <div className="mb-4">
          <Link
            href="/tasks"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            &larr; Back to Tasks
          </Link>
        </div>

        <TaskForm
          availableSubs={[]}
          availableProjects={availableProjects}
          task={{
            id: task.id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            deadline: task.deadline,
            tags: task.tags,
            subId: task.sub.id,
            projectId: task.project?.id ?? null,
          }}
          onClose={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <Link
          href="/tasks"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          &larr; Back to Tasks
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {task.title}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Task Info Section */}
      <div className="mt-6 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status badge */}
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[task.status]} ${
              task.status === "SUBMITTED"
                ? "ring-2 ring-amber-300 dark:ring-amber-600"
                : ""
            }`}
          >
            {STATUS_LABELS[task.status]}
          </span>

          {/* Priority badge */}
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}
          >
            {task.priority}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Assigned sub */}
          <div>
            <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Assigned To
            </dt>
            <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
              {task.sub.fullName}
            </dd>
          </div>

          {/* Project */}
          {task.project && (
            <div>
              <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Project
              </dt>
              <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                <Link
                  href={`/hub/projects/${task.project.id}`}
                  className="hover:underline"
                >
                  {task.project.name}
                </Link>
              </dd>
            </div>
          )}

          {/* Deadline */}
          {task.deadline && (
            <div>
              <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Deadline
              </dt>
              <dd
                className={`mt-1 text-sm ${
                  overdue
                    ? "font-medium text-red-600 dark:text-red-400"
                    : "text-zinc-900 dark:text-zinc-50"
                }`}
              >
                {formatDate(task.deadline)}
                {overdue && " (overdue)"}
              </dd>
            </div>
          )}

          {/* Completed at */}
          {task.completedAt && (
            <div>
              <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Completed
              </dt>
              <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                {formatDate(task.completedAt)}
              </dd>
            </div>
          )}
        </dl>

        {/* Description */}
        {task.description && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Description
            </h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-50">
              {task.description}
            </p>
          </div>
        )}

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Tags
            </h3>
            <div className="mt-1 flex flex-wrap gap-1">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="mt-4 flex gap-4 text-xs text-zinc-400 dark:text-zinc-500">
          <span>Created {formatDate(task.createdAt)}</span>
          <span>Updated {formatDate(task.updatedAt)}</span>
        </div>
      </div>

      {/* Status Action Buttons */}
      <div className="mt-6">
        {task.status === "SUBMITTED" && (
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusChange("COMPLETED")}
              disabled={actionLoading}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
            >
              Approve
            </button>
            <button
              onClick={() => handleStatusChange("IN_PROGRESS")}
              disabled={actionLoading}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Return for Revision
            </button>
          </div>
        )}

        {task.status === "NOT_STARTED" && (
          <button
            onClick={() => handleStatusChange("IN_PROGRESS")}
            disabled={actionLoading}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Start
          </button>
        )}
      </div>

      {/* Subtasks Section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Subtasks
        </h2>
        <div className="mt-3">
          <SubtaskList subtasks={task.subtasks} taskId={task.id} />
          <div className="mt-3">
            <SubtaskForm taskId={task.id} />
          </div>
        </div>
      </div>

      {/* Proofs Section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Proofs
        </h2>
        <div className="mt-3">
          <TaskProofs proofs={task.proofs} />
        </div>
      </div>

      {/* Dependencies Section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Dependencies
        </h2>
        <div className="mt-3">
          <TaskDependencies
            dependsOn={task.dependsOn}
            dependedOnBy={task.dependedOnBy}
            availableTasks={availableTasks}
            taskId={task.id}
          />
        </div>
      </div>
    </div>
  );
}
