"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORY_OPTIONS = [
  "Tribute",
  "Gift",
  "Session",
  "Tip",
  "Task Payment",
  "Custom",
];

const PAYMENT_METHOD_OPTIONS = [
  "CashApp",
  "Venmo",
  "PayPal",
  "Crypto",
  "Bank Transfer",
  "Custom",
];

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CAD", "AUD"];

type AvailableSub = {
  id: string;
  fullName: string;
};

type EntryData = {
  id: string;
  amount: string;
  currency: string;
  category: string;
  paymentMethod: string | null;
  notes: string | null;
  date: string;
  isInApp: boolean;
  subId: string | null;
};

export default function FinancialEntryForm({
  subs,
  entry,
  onClose,
}: {
  subs: AvailableSub[];
  entry?: EntryData;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!entry;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const amount = parseFloat(form.get("amount") as string);
    const category = form.get("category") as string;

    if (!amount || amount <= 0) {
      setError("Amount must be a positive number");
      setSubmitting(false);
      return;
    }

    if (!category) {
      setError("Category is required");
      setSubmitting(false);
      return;
    }

    const body = {
      amount,
      currency: form.get("currency") as string,
      category,
      paymentMethod: (form.get("paymentMethod") as string) || null,
      notes: (form.get("notes") as string) || null,
      date: (form.get("date") as string) || undefined,
      isInApp: form.get("isInApp") === "on",
      subId: (form.get("subId") as string) || null,
    };

    try {
      const url = isEditing
        ? `/api/financials/${entry.id}`
        : "/api/financials";
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save entry");
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
        {isEditing ? "Edit Entry" : "New Entry"}
      </h3>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Amount */}
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Amount *
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              step="0.01"
              min="0.01"
              defaultValue={entry?.amount || ""}
              required
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          {/* Currency */}
          <div>
            <label
              htmlFor="currency"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Currency
            </label>
            <select
              id="currency"
              name="currency"
              defaultValue={entry?.currency || "USD"}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Category *
            </label>
            <select
              id="category"
              name="category"
              defaultValue={entry?.category || ""}
              required
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">Select...</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label
              htmlFor="paymentMethod"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Payment Method
            </label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              defaultValue={entry?.paymentMethod || ""}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">None</option>
              {PAYMENT_METHOD_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Sub */}
          <div>
            <label
              htmlFor="subId"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Sub
            </label>
            <select
              id="subId"
              name="subId"
              defaultValue={entry?.subId || ""}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">Unlinked</option>
              {subs.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Date
            </label>
            <input
              type="date"
              id="date"
              name="date"
              defaultValue={
                entry?.date
                  ? new Date(entry.date).toISOString().split("T")[0]
                  : today
              }
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
        </div>

        {/* In-app toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isInApp"
            name="isInApp"
            defaultChecked={entry?.isInApp ?? true}
            className="rounded border-zinc-300 dark:border-zinc-600"
          />
          <label
            htmlFor="isInApp"
            className="text-sm text-zinc-700 dark:text-zinc-300"
          >
            In-app transaction
          </label>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={entry?.notes || ""}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {submitting
              ? "Saving..."
              : isEditing
                ? "Update Entry"
                : "Add Entry"}
          </button>
        </div>
      </form>
    </div>
  );
}
