"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Subtask = {
  id: string;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
};

type Proof = {
  id: string;
  fileUrl: string;
  fileType: string;
  mimeType: string | null;
  notes: string | null;
  createdAt: string;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED" | "ARCHIVED";
  deadline: string | null;
  tags: string[];
  sub: { id: string; fullName: string };
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks: Subtask[];
  proofs: Proof[];
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
};

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
};

function isOverdue(deadline: string | null, status: string): boolean {
  if (!deadline) return false;
  if (status === "COMPLETED" || status === "ARCHIVED") return false;
  return new Date(deadline) < new Date();
}

function formatDeadline(deadline: string): string {
  return new Date(deadline).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MyTaskDetailClient({ task }: { task: Task }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [proofNotes, setProofNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const overdue = isOverdue(task.deadline, task.status);
  const completedSubtasks = task.subtasks.filter((s) => s.isCompleted).length;

  async function handleUploadProof() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Step 1: Upload file to /api/upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "task-proofs");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const uploadErr = await uploadRes.json();
        throw new Error(uploadErr.error || "Upload failed");
      }

      const { url } = await uploadRes.json();

      // Step 2: Create proof record
      const proofRes = await fetch(`/api/my-tasks/${task.id}/proofs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: url,
          fileType: file.type.startsWith("image") ? "image" : "video",
          mimeType: file.type,
          fileSize: file.size,
          notes: proofNotes || null,
        }),
      });

      if (!proofRes.ok) {
        const proofErr = await proofRes.json();
        throw new Error(proofErr.error || "Failed to save proof");
      }

      // Reset form and refresh
      setProofNotes("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmitTask() {
    if (!confirm("Submit this task for review?")) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/my-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SUBMITTED" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit task");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/my-tasks"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          &larr; Back to My Tasks
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {task.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}
          >
            {STATUS_LABELS[task.status]}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}
          >
            {task.priority}
          </span>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Task info */}
      <div className="space-y-6">
        {/* Description */}
        {task.description && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Description
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
              {task.description}
            </p>
          </div>
        )}

        {/* Deadline */}
        {task.deadline && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Deadline
            </h2>
            <p
              className={`mt-1 text-sm ${
                overdue
                  ? "font-medium text-red-600 dark:text-red-400"
                  : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {formatDeadline(task.deadline)}
              {overdue && " (overdue)"}
            </p>
          </div>
        )}

        {/* Tags */}
        {task.tags.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Tags
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
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

        {/* Subtasks */}
        {task.subtasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Subtasks
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {completedSubtasks}/{task.subtasks.length} completed
            </p>
            <ul className="mt-3 space-y-2">
              {task.subtasks.map((subtask) => (
                <li key={subtask.id} className="flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      subtask.isCompleted
                        ? "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-zinc-900"
                        : "border-zinc-300 dark:border-zinc-600"
                    }`}
                  >
                    {subtask.isCompleted && (
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </span>
                  <span
                    className={`text-sm ${
                      subtask.isCompleted
                        ? "text-zinc-400 line-through dark:text-zinc-500"
                        : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {subtask.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Proof of Completion */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Proof of Completion
          </h2>

          {/* Existing proofs */}
          {task.proofs.length > 0 && (
            <div className="mt-3 space-y-4">
              {task.proofs.map((proof) => (
                <div
                  key={proof.id}
                  className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  {proof.fileType === "image" ? (
                    <img
                      src={proof.fileUrl}
                      alt="Proof"
                      className="max-h-64 rounded-md object-contain"
                    />
                  ) : (
                    <video
                      src={proof.fileUrl}
                      controls
                      className="max-h-64 w-full rounded-md"
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                  {proof.notes && (
                    <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                      {proof.notes}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Uploaded {formatTimestamp(proof.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Upload form (only when task is not completed) */}
          {task.status !== "COMPLETED" && (
            <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="proof-file"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Upload file
                  </label>
                  <input
                    ref={fileInputRef}
                    id="proof-file"
                    type="file"
                    accept="image/*,video/*"
                    className="mt-1 block w-full text-sm text-zinc-700 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-300 dark:file:bg-zinc-800 dark:file:text-zinc-300 dark:hover:file:bg-zinc-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="proof-notes"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Notes (optional)
                  </label>
                  <textarea
                    id="proof-notes"
                    value={proofNotes}
                    onChange={(e) => setProofNotes(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    placeholder="Add any notes about this proof..."
                  />
                </div>

                <button
                  onClick={handleUploadProof}
                  disabled={uploading}
                  className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  {uploading ? "Uploading..." : "Upload Proof"}
                </button>
              </div>
            </div>
          )}

          {task.proofs.length === 0 && task.status === "COMPLETED" && (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              No proofs uploaded.
            </p>
          )}
        </div>

        {/* Submit / Status section */}
        <div className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
          {(task.status === "NOT_STARTED" || task.status === "IN_PROGRESS") && (
            <button
              onClick={handleSubmitTask}
              disabled={submitting}
              className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {submitting ? "Submitting..." : "Submit as Done"}
            </button>
          )}

          {task.status === "SUBMITTED" && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              Awaiting review from your Domme.
            </div>
          )}

          {task.status === "COMPLETED" && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
              Task approved
              {task.completedAt &&
                ` on ${formatDeadline(task.completedAt)}`}
              .
            </div>
          )}
        </div>
      </div>
    </>
  );
}
