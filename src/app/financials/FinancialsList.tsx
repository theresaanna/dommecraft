"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FinancialEntry = {
  id: string;
  amount: string;
  currency: string;
  category: string;
  paymentMethod: string | null;
  notes: string | null;
  date: string;
  isInApp: boolean;
  sub: { id: string; fullName: string } | null;
};

export default function FinancialsList({
  entries,
}: {
  entries: FinancialEntry[];
}) {
  const router = useRouter();
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
    if (selected.size === entries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(entries.map((e) => e.id)));
    }
  }

  async function handleExport(format: "pdf" | "csv") {
    setExporting(format);
    try {
      const res = await fetch("/api/financials/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });

      if (!res.ok) return;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `financials-export.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }

  async function handleDelete() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Delete ${selected.size} entr${selected.size > 1 ? "ies" : "y"}? This cannot be undone.`
      )
    )
      return;

    const promises = [...selected].map((id) =>
      fetch(`/api/financials/${id}`, { method: "DELETE" })
    );
    await Promise.all(promises);
    setSelected(new Set());
    router.refresh();
  }

  function formatCurrency(amount: string, currency: string): string {
    const num = parseFloat(amount);
    if (isNaN(num)) return `${currency} 0.00`;
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "\u20AC" : currency === "GBP" ? "\u00A3" : `${currency} `;
    return `${symbol}${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <>
      {entries.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={toggleAll}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {selected.size === entries.length ? "Deselect All" : "Select All"}
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
                onClick={handleDelete}
                className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Delete ({selected.size})
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

      {entries.length === 0 ? (
        <p className="mt-8 text-center text-zinc-500 dark:text-zinc-400">
          No financial entries yet. Add your first entry to get started.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.has(entry.id)}
                onChange={() => toggleSelect(entry.id)}
                className="ml-1 rounded border-zinc-300 dark:border-zinc-600"
              />
              <div className="flex-1 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(entry.amount, entry.currency)}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {entry.category}
                    </span>
                    {entry.isInApp && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        In-app
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {new Date(entry.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                  <span>{entry.sub?.fullName || "Unlinked"}</span>
                  {entry.paymentMethod && (
                    <>
                      <span>&middot;</span>
                      <span>{entry.paymentMethod}</span>
                    </>
                  )}
                  {entry.notes && (
                    <>
                      <span>&middot;</span>
                      <span className="truncate max-w-xs">{entry.notes}</span>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
