"use client";

type Proof = {
  id: string;
  fileUrl: string;
  fileType: string;
  mimeType: string | null;
  fileSize: number | null;
  notes: string | null;
  createdAt: string;
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

export default function TaskProofs({ proofs }: { proofs: Proof[] }) {
  if (proofs.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No proofs submitted yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {proofs.map((proof) => (
        <div
          key={proof.id}
          className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          {/* Media preview */}
          {proof.fileType.startsWith("image") ? (
            <img
              src={proof.fileUrl}
              alt="Proof upload"
              className="max-h-48 rounded object-contain"
            />
          ) : proof.fileType.startsWith("video") ? (
            <video
              src={proof.fileUrl}
              controls
              className="max-h-48 rounded"
            />
          ) : (
            <a
              href={proof.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-zinc-900 underline hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300"
            >
              View File
            </a>
          )}

          {/* Notes */}
          {proof.notes && (
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              {proof.notes}
            </p>
          )}

          {/* Timestamp */}
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
            {formatDate(proof.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
}
