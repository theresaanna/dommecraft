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
          className="text-base text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          &larr; Calendar
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
        New Event
      </h1>
      <div className="mt-6 rounded-lg border border-zinc-200 bg-white/40 backdrop-blur-sm p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <CalendarEventForm onClose={() => router.push("/calendar")} />
      </div>
    </>
  );
}
