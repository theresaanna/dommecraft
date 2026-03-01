"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
import CalendarEventForm from "./CalendarEventForm";

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

function temporalToString(
  value: unknown,
  isAllDay: boolean
): string {
  if (typeof value === "string") return value;
  const t = value as {
    year: number;
    month: number;
    day: number;
    hour?: number;
    minute?: number;
  };
  const date = `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
  if (isAllDay) return date;
  return `${date} ${String(t.hour ?? 0).padStart(2, "0")}:${String(t.minute ?? 0).padStart(2, "0")}`;
}

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
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventData | null>(
    null
  );
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
    },
    callbacks: {
      onRangeUpdate(range) {
        const start = new Date(range.start.epochMilliseconds).toISOString();
        const end = new Date(range.end.epochMilliseconds).toISOString();
        currentRangeRef.current = { start, end };
        fetchEvents(start, end);
      },
      onEventClick(calendarEvent) {
        const raw = calendarEvent as unknown as Record<string, unknown>;
        if (raw.sourceType === "STANDALONE") {
          const T = globalThis.Temporal;
          const isAllDay = raw.start instanceof T.PlainDate;
          setEditingEvent({
            id: raw.id as string,
            title: raw.title as string,
            description: (raw.description as string) ?? null,
            start: temporalToString(raw.start, isAllDay),
            end: temporalToString(raw.end, isAllDay),
            calendarId: raw.calendarId as string,
            isAllDay,
            sourceType: raw.sourceType as string,
            sourceTaskId: null,
            originalEventId: raw.originalEventId as string,
          });
          setShowForm(true);
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

  function refetchCurrentRange() {
    if (currentRangeRef.current) {
      fetchEvents(currentRangeRef.current.start, currentRangeRef.current.end);
    } else {
      // Fallback: fetch current month
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      fetchEvents(start.toISOString(), end.toISOString());
    }
  }

  function handleFormClose() {
    setShowForm(false);
    setEditingEvent(null);
    refetchCurrentRange();
  }

  async function handleDeleteEvent() {
    if (!editingEvent) return;
    try {
      const res = await fetch(
        `/api/calendar/events/${editingEvent.originalEventId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        handleFormClose();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

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
        <button
          onClick={() => {
            setEditingEvent(null);
            setShowForm(!showForm);
          }}
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {showForm ? "Cancel" : "New Event"}
        </button>
      </div>

      {showForm && (
        <div className="mt-4">
          <CalendarEventForm event={editingEvent} onClose={handleFormClose} />
          {editingEvent && (
            <button
              onClick={handleDeleteEvent}
              className="mt-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Delete this event
            </button>
          )}
        </div>
      )}

      <div className="sx-react-calendar mt-6">
        <ScheduleXCalendar calendarApp={calendar} />
      </div>
    </>
  );
}
