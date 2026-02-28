"use client";

import { useState } from "react";
import Link from "next/link";

type Sub = {
  id: string;
  fullName: string;
  contactInfo: string | null;
  arrangementType: string[];
  subType: string[];
  tags: string[];
  createdAt: string;
};

export default function SubsList({
  subs,
  query,
}: {
  subs: Sub[];
  query?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === subs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(subs.map((s) => s.id)));
    }
  }

  async function handleExport(format: "pdf" | "csv") {
    const ids = selected.size > 0 ? [...selected] : subs.map((s) => s.id);
    setExporting(format);

    try {
      const res = await fetch("/api/subs/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subIds: ids, format }),
      });

      if (!res.ok) return;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subs-export.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }

  async function handleArchive() {
    if (selected.size === 0) return;
    if (
      !confirm(`Archive ${selected.size} sub${selected.size > 1 ? "s" : ""}?`)
    )
      return;

    const promises = [...selected].map((id) =>
      fetch(`/api/subs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: true }),
      })
    );
    await Promise.all(promises);
    window.location.reload();
  }

  return (
    <>
      {subs.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={toggleAll}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {selected.size === subs.length ? "Deselect All" : "Select All"}
          </button>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

          <button
            onClick={() => handleExport("csv")}
            disabled={exporting !== null}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {exporting === "csv" ? "Exporting..." : "Export CSV"}
          </button>
          <button
            onClick={() => handleExport("pdf")}
            disabled={exporting !== null}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {exporting === "pdf" ? "Exporting..." : "Export PDF"}
          </button>

          {selected.size > 0 && (
            <>
              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
              <button
                onClick={handleArchive}
                className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Archive ({selected.size})
              </button>
            </>
          )}

          {selected.size > 0 && (
            <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
              {selected.size} selected
            </span>
          )}
        </div>
      )}

      {subs.length === 0 ? (
        <p className="mt-8 text-center text-zinc-500 dark:text-zinc-400">
          {query
            ? "No subs match your search."
            : "No subs yet. Add your first sub to get started."}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
          {subs.map((sub) => (
            <li key={sub.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.has(sub.id)}
                onChange={() => toggleSelect(sub.id)}
                className="ml-1 rounded border-zinc-300 dark:border-zinc-600"
              />
              <Link
                href={`/subs/${sub.id}`}
                className="block flex-1 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                    {sub.fullName}
                  </h2>
                  {sub.contactInfo && (
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {sub.contactInfo}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {sub.subType.map((type) => (
                    <span
                      key={type}
                      className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      {type}
                    </span>
                  ))}
                  {sub.arrangementType.map((type) => (
                    <span
                      key={type}
                      className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                    >
                      {type}
                    </span>
                  ))}
                </div>
                {sub.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {sub.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs text-zinc-400 dark:text-zinc-500"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
