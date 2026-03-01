"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const COLOR_OPTIONS = [
  { label: "Default", value: "" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Red", value: "#ef4444" },
  { label: "Green", value: "#22c55e" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Orange", value: "#f97316" },
  { label: "Pink", value: "#ec4899" },
];

const RECURRENCE_OPTIONS = [
  { label: "None", value: "" },
  { label: "Daily", value: "FREQ=DAILY" },
  { label: "Weekly", value: "FREQ=WEEKLY" },
  { label: "Monthly", value: "FREQ=MONTHLY" },
  { label: "Yearly", value: "FREQ=YEARLY" },
];

type EventData = {
  id: string;
  originalEventId: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  isAllDay: boolean;
  calendarId: string;
  sourceType: string;
};

export default function CalendarEventForm({
  event,
  onClose,
}: {
  event?: EventData | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isAllDay, setIsAllDay] = useState(event?.isAllDay ?? false);

  const isEditing = !!event;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const title = form.get("title") as string;
    const isAllDay = form.get("isAllDay") === "on";

    if (!title?.trim()) {
      setError("Title is required");
      setSubmitting(false);
      return;
    }

    let startAt: string;
    if (isAllDay) {
      const dateVal = form.get("startDate") as string;
      if (!dateVal) {
        setError("Start date is required");
        setSubmitting(false);
        return;
      }
      startAt = new Date(dateVal + "T00:00:00").toISOString();
    } else {
      const dateTimeVal = form.get("startAt") as string;
      if (!dateTimeVal) {
        setError("Start date/time is required");
        setSubmitting(false);
        return;
      }
      startAt = new Date(dateTimeVal).toISOString();
    }

    let endAt: string | null = null;
    if (isAllDay) {
      const endDateVal = form.get("endDate") as string;
      if (endDateVal) {
        endAt = new Date(endDateVal + "T23:59:59").toISOString();
      }
    } else {
      const endTimeVal = form.get("endAt") as string;
      if (endTimeVal) {
        endAt = new Date(endTimeVal).toISOString();
      }
    }

    const body = {
      title: title.trim(),
      description: (form.get("description") as string) || null,
      startAt,
      endAt,
      isAllDay,
      color: (form.get("color") as string) || null,
      category: (form.get("category") as string) || null,
      recurrenceRule: (form.get("recurrenceRule") as string) || null,
    };

    try {
      const url = isEditing
        ? `/api/calendar/events/${event.originalEventId}`
        : "/api/calendar/events";
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save event");
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

  const defaultStart = event?.start
    ? event.start.replace(" ", "T")
    : "";
  const defaultEnd = event?.end
    ? event.end.replace(" ", "T")
    : "";

  return (
    <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
        {isEditing ? "Edit Event" : "New Event"}
      </h3>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            defaultValue={event?.title || ""}
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={event?.description || ""}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        {/* All Day */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isAllDay"
            name="isAllDay"
            checked={isAllDay}
            onChange={(e) => setIsAllDay(e.target.checked)}
            className="rounded border-zinc-300 dark:border-zinc-600"
          />
          <label
            htmlFor="isAllDay"
            className="text-sm text-zinc-700 dark:text-zinc-300"
          >
            All-day event
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Start */}
          <div>
            <label
              htmlFor={isAllDay ? "startDate" : "startAt"}
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Start *
            </label>
            {isAllDay ? (
              <input
                type="date"
                id="startDate"
                name="startDate"
                defaultValue={defaultStart.split("T")[0]}
                required
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            ) : (
              <input
                type="datetime-local"
                id="startAt"
                name="startAt"
                defaultValue={defaultStart}
                required
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            )}
          </div>

          {/* End */}
          <div>
            <label
              htmlFor={isAllDay ? "endDate" : "endAt"}
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              End
            </label>
            {isAllDay ? (
              <input
                type="date"
                id="endDate"
                name="endDate"
                defaultValue={defaultEnd.split("T")[0]}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            ) : (
              <input
                type="datetime-local"
                id="endAt"
                name="endAt"
                defaultValue={defaultEnd}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Color */}
          <div>
            <label
              htmlFor="color"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Color
            </label>
            <select
              id="color"
              name="color"
              defaultValue=""
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              {COLOR_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Category
            </label>
            <input
              type="text"
              id="category"
              name="category"
              defaultValue=""
              placeholder="e.g. Session, Meeting"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
        </div>

        {/* Recurrence */}
        <div>
          <label
            htmlFor="recurrenceRule"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Repeat
          </label>
          <select
            id="recurrenceRule"
            name="recurrenceRule"
            defaultValue=""
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            {RECURRENCE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
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
                ? "Update Event"
                : "Add Event"}
          </button>
        </div>
      </form>
    </div>
  );
}
