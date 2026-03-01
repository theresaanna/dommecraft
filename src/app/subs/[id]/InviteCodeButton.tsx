"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteCodeButton({
  subId,
  existingCode,
}: {
  subId: string;
  existingCode: string | null;
}) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState(existingCode);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/subs/${subId}/invite`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate invite code");
        return;
      }
      const data = await res.json();
      setInviteCode(data.inviteCode);
      router.refresh();
    } catch {
      setError("Failed to generate invite code");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-3">
      {inviteCode ? (
        <div className="flex items-center gap-2">
          <code className="rounded bg-zinc-100 px-3 py-1.5 text-sm font-mono text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
            {inviteCode}
          </code>
          <button
            onClick={handleCopy}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Regenerate
          </button>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {generating ? "Generating..." : "Generate Invite Code"}
        </button>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
