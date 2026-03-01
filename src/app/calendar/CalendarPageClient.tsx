"use client";

import { useState, useEffect, useCallback } from "react";
import { ScheduleXCalendar, useCalendarApp } from "@schedule-x/react";
import {
  createViewDay,
  createViewWeek,
  createViewMonthGrid,
} from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
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

export default function CalendarPageClient() {
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventData | null>(
    null
  );
  const [currentRange, setCurrentRange] = useState<{
    start: string;
    end: string;
  } | null>(null);

  const eventsService = useState(() => createEventsServicePlugin())[0];

  const fetchEvents = useCallback(
    async (start: string, end: string) => {
      try {
        const res = await fetch(
          `/api/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
        );
        if (res.ok) {
          const data: CalendarEventData[] = await res.json();
          eventsService.set(data);
        }
      } catch {
        // Silently fail; user can retry by navigating
      }
    },
    [eventsService]
  );

  const calendar = useCalendarApp({
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
        setCurrentRange(range);
        fetchEvents(range.start, range.end);
      },
      onEventClick(calendarEvent) {
        const eventData = calendarEvent as unknown as CalendarEventData;
        if (eventData.sourceType === "STANDALONE") {
          setEditingEvent(eventData);
          setShowForm(true);
        }
      },
    },
  });

  // Fetch initial events on mount
  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    fetchEvents(start.toISOString(), end.toISOString());
  }, [fetchEvents]);

  function handleFormClose() {
    setShowForm(false);
    setEditingEvent(null);
    if (currentRange) {
      fetchEvents(currentRange.start, currentRange.end);
    }
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
    } catch {
      // Silently fail
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
