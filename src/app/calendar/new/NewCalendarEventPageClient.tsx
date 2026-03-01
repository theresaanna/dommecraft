"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import CalendarEventForm from "../CalendarEventForm";

export default function NewCalendarEventPageClient() {
  const router = useRouter();

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
        New Event
      </h1>
      <div className="mt-6">
        <CalendarEventForm onClose={() => router.push("/calendar")} />
      </div>
    </>
  );
}
