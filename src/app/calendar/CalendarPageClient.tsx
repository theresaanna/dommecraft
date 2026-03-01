"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScheduleXCalendar, useNextCalendarApp } from "@schedule-x/react";
import {
  createViewDay,
  createViewWeek,
  createViewMonthGrid,
} from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import "temporal-polyfill/global";
import "@schedule-x/theme-default/dist/index.css";
import Link from "next/link";

type CalendarEventData = {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  calendarId: string;
  isAllDay: boolean;
  sourceType: string;
  sourceTaskId: string | null;
  originalEventId: string;
};

function toScheduleXEvent(e: CalendarEventData) {
  const T = globalThis.Temporal;
  return {
    id: e.id,
    title: e.title,
    description: e.description ?? undefined,
    calendarId: e.calendarId,
    start: e.isAllDay
      ? T.PlainDate.from(e.start)
      : T.ZonedDateTime.from(e.start.replace(" ", "T") + ":00[UTC]"),
    end: e.isAllDay
      ? T.PlainDate.from(e.end)
      : T.ZonedDateTime.from(e.end.replace(" ", "T") + ":00[UTC]"),
    sourceType: e.sourceType,
    originalEventId: e.originalEventId,
  };
}

export default function CalendarPageClient() {
  const router = useRouter();
  const currentRangeRef = useRef<{ start: string; end: string } | null>(null);

  const eventsService = useState(() => createEventsServicePlugin())[0];

  const fetchEvents = useCallback(
    async (start: string, end: string) => {
      try {
        const res = await fetch(
          `/api/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
        );
        if (!res.ok) {
          const data = await res.json();
          console.error("Calendar API error:", data.error);
          return;
        }
        const data: CalendarEventData[] = await res.json();
        eventsService.set(data.map(toScheduleXEvent));
      } catch (err) {
        console.error("Calendar fetch error:", err);
      }
    },
    [eventsService]
  );

  const calendar = useNextCalendarApp({
    views: [createViewMonthGrid(), createViewWeek(), createViewDay()],
    defaultView: "month-grid",
    plugins: [eventsService],
    calendars: {
      standalone: {
        colorName: "standalone",
        label: "Events",
        lightColors: {
          main: "#3b82f6",
          container: "#dbeafe",
          onContainer: "#1e40af",
        },
        darkColors: {
          main: "#60a5fa",
          container: "#1e3a5f",
          onContainer: "#bfdbfe",
        },
      },
      task: {
        colorName: "task",
        label: "Tasks",
        lightColors: {
          main: "#f59e0b",
          container: "#fef3c7",
          onContainer: "#92400e",
        },
        darkColors: {
          main: "#fbbf24",
          container: "#451a03",
          onContainer: "#fde68a",
        },
      },
      reminder: {
        colorName: "reminder",
        label: "Reminders",
        lightColors: {
          main: "#8b5cf6",
          container: "#ede9fe",
          onContainer: "#5b21b6",
        },
        darkColors: {
          main: "#a78bfa",
          container: "#2e1065",
          onContainer: "#ddd6fe",
        },
      },
      "#3b82f6": {
        colorName: "blue",
        label: "Blue",
        lightColors: { main: "#3b82f6", container: "#dbeafe", onContainer: "#1e40af" },
        darkColors: { main: "#60a5fa", container: "#1e3a5f", onContainer: "#bfdbfe" },
      },
      "#ef4444": {
        colorName: "red",
        label: "Red",
        lightColors: { main: "#ef4444", container: "#fee2e2", onContainer: "#991b1b" },
        darkColors: { main: "#f87171", container: "#450a0a", onContainer: "#fecaca" },
      },
      "#22c55e": {
        colorName: "green",
        label: "Green",
        lightColors: { main: "#22c55e", container: "#dcfce7", onContainer: "#166534" },
        darkColors: { main: "#4ade80", container: "#052e16", onContainer: "#bbf7d0" },
      },
      "#8b5cf6": {
        colorName: "purple",
        label: "Purple",
        lightColors: { main: "#8b5cf6", container: "#ede9fe", onContainer: "#5b21b6" },
        darkColors: { main: "#a78bfa", container: "#2e1065", onContainer: "#ddd6fe" },
      },
      "#f97316": {
        colorName: "orange",
        label: "Orange",
        lightColors: { main: "#f97316", container: "#ffedd5", onContainer: "#9a3412" },
        darkColors: { main: "#fb923c", container: "#431407", onContainer: "#fed7aa" },
      },
      "#ec4899": {
        colorName: "pink",
        label: "Pink",
        lightColors: { main: "#ec4899", container: "#fce7f3", onContainer: "#9d174d" },
        darkColors: { main: "#f472b6", container: "#500724", onContainer: "#fbcfe8" },
      },
    },
    callbacks: {
      onRangeUpdate(range: { start: { epochMilliseconds: number }; end: { epochMilliseconds: number } }) {
        const start = new Date(range.start.epochMilliseconds).toISOString();
        const end = new Date(range.end.epochMilliseconds).toISOString();
        currentRangeRef.current = { start, end };
        fetchEvents(start, end);
      },
      onEventClick(calendarEvent: Record<string, unknown>) {
        if (calendarEvent.sourceType === "STANDALONE") {
          const originalEventId = calendarEvent.originalEventId as string;
          router.push(`/calendar/${originalEventId}/edit`);
        }
      },
    },
  });

  // Fetch events once the calendar is mounted — the first onRangeUpdate
  // fires during calendar creation before the component is fully ready.
  useEffect(() => {
    if (calendar) {
      const timer = setTimeout(() => {
        if (currentRangeRef.current) {
          fetchEvents(
            currentRangeRef.current.start,
            currentRangeRef.current.end
          );
        } else {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
          fetchEvents(start.toISOString(), end.toISOString());
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [calendar, fetchEvents]);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            &larr; Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Calendar
          </h1>
        </div>
        <Link
          href="/calendar/new"
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          New Event
        </Link>
      </div>

      <div className="sx-react-calendar mt-6">
        <ScheduleXCalendar calendarApp={calendar} />
      </div>
    </>
  );
}
