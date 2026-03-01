"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CalendarEventForm from "../../CalendarEventForm";

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

export default function EditCalendarEventClient({
  event,
}: {
  event: EventData;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/calendar/events/${event.originalEventId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/calendar");
      }
    } catch {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href="/calendar"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          &larr; Calendar
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Edit Event
      </h1>
      <div className="mt-6">
        <CalendarEventForm
          event={event}
          onClose={() => router.push("/calendar")}
        />
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="mt-4 text-sm text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
        >
          {deleting ? "Deleting..." : "Delete this event"}
        </button>
      </div>
    </>
  );
}
