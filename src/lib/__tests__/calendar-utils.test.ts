import { describe, it, expect } from "vitest";
import { expandEvents, formatForScheduleX } from "@/lib/calendar-utils";

describe("formatForScheduleX", () => {
  it("formats date-time as YYYY-MM-DD HH:mm for non all-day events", () => {
    const date = new Date(2024, 5, 15, 14, 30); // June 15, 2024 14:30
    expect(formatForScheduleX(date, false)).toBe("2024-06-15 14:30");
  });

  it("formats date as YYYY-MM-DD for all-day events", () => {
    const date = new Date(2024, 5, 15, 14, 30);
    expect(formatForScheduleX(date, true)).toBe("2024-06-15");
  });

  it("pads single-digit month and day", () => {
    const date = new Date(2024, 0, 5, 9, 5); // Jan 5, 2024 09:05
    expect(formatForScheduleX(date, false)).toBe("2024-01-05 09:05");
  });
});

describe("expandEvents", () => {
  const rangeStart = new Date("2024-06-01T00:00:00Z");
  const rangeEnd = new Date("2024-06-30T23:59:59Z");

  it("returns empty array for empty input", () => {
    expect(expandEvents([], rangeStart, rangeEnd)).toEqual([]);
  });

  it("includes single non-recurring event within range", () => {
    const events = [
      {
        id: "evt-1",
        title: "Meeting",
        description: "Team sync",
        startAt: new Date("2024-06-10T10:00:00Z"),
        endAt: new Date("2024-06-10T11:00:00Z"),
        isAllDay: false,
        color: null,
        recurrenceRule: null,
        sourceType: "STANDALONE",
        sourceTaskId: null,
      },
    ];

    const result = expandEvents(events, rangeStart, rangeEnd);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("evt-1");
    expect(result[0].title).toBe("Meeting");
    expect(result[0].originalEventId).toBe("evt-1");
    expect(result[0].calendarId).toBe("standalone");
  });

  it("excludes single event outside range", () => {
    const events = [
      {
        id: "evt-1",
        title: "Old Meeting",
        description: null,
        startAt: new Date("2024-05-01T10:00:00Z"),
        endAt: new Date("2024-05-01T11:00:00Z"),
        isAllDay: false,
        color: null,
        recurrenceRule: null,
        sourceType: "STANDALONE",
        sourceTaskId: null,
      },
    ];

    const result = expandEvents(events, rangeStart, rangeEnd);
    expect(result).toHaveLength(0);
  });

  it("uses color as calendarId when color is set", () => {
    const events = [
      {
        id: "evt-1",
        title: "Colored Event",
        description: null,
        startAt: new Date("2024-06-10T10:00:00Z"),
        endAt: new Date("2024-06-10T11:00:00Z"),
        isAllDay: false,
        color: "#ff0000",
        recurrenceRule: null,
        sourceType: "STANDALONE",
        sourceTaskId: null,
      },
    ];

    const result = expandEvents(events, rangeStart, rangeEnd);
    expect(result[0].calendarId).toBe("#ff0000");
  });

  it("uses sourceType as calendarId when no color", () => {
    const events = [
      {
        id: "evt-1",
        title: "Task Event",
        description: null,
        startAt: new Date("2024-06-10T10:00:00Z"),
        endAt: null,
        isAllDay: false,
        color: null,
        recurrenceRule: null,
        sourceType: "TASK",
        sourceTaskId: "task-1",
      },
    ];

    const result = expandEvents(events, rangeStart, rangeEnd);
    expect(result[0].calendarId).toBe("task");
  });

  it("defaults to 1 hour duration when endAt is null", () => {
    const events = [
      {
        id: "evt-1",
        title: "Quick Event",
        description: null,
        startAt: new Date("2024-06-10T10:00:00Z"),
        endAt: null,
        isAllDay: false,
        color: null,
        recurrenceRule: null,
        sourceType: "STANDALONE",
        sourceTaskId: null,
      },
    ];

    const result = expandEvents(events, rangeStart, rangeEnd);
    expect(result).toHaveLength(1);
    // End should be 1 hour after start
    const startTime = new Date("2024-06-10T10:00:00Z").getTime();
    const expectedEnd = new Date(startTime + 60 * 60 * 1000);
    expect(result[0].end).toBe(formatForScheduleX(expectedEnd, false));
  });

  it("formats all-day events with date only", () => {
    const events = [
      {
        id: "evt-1",
        title: "All Day",
        description: null,
        startAt: new Date("2024-06-10T00:00:00Z"),
        endAt: new Date("2024-06-10T23:59:59Z"),
        isAllDay: true,
        color: null,
        recurrenceRule: null,
        sourceType: "STANDALONE",
        sourceTaskId: null,
      },
    ];

    const result = expandEvents(events, rangeStart, rangeEnd);
    expect(result[0].start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result[0].isAllDay).toBe(true);
  });

  it("expands daily recurring events within range", () => {
    const events = [
      {
        id: "evt-1",
        title: "Daily Standup",
        description: null,
        startAt: new Date("2024-06-01T09:00:00Z"),
        endAt: new Date("2024-06-01T09:30:00Z"),
        isAllDay: false,
        color: null,
        recurrenceRule: "DTSTART:20240601T090000Z\nRRULE:FREQ=DAILY;COUNT=5",
        sourceType: "STANDALONE",
        sourceTaskId: null,
      },
    ];

    const result = expandEvents(events, rangeStart, rangeEnd);
    expect(result).toHaveLength(5);
    // Each occurrence should have a unique id
    const ids = result.map((r) => r.id);
    expect(new Set(ids).size).toBe(5);
    // All should reference the original event
    result.forEach((r) => {
      expect(r.originalEventId).toBe("evt-1");
    });
  });

  it("expands weekly recurring events within range", () => {
    const events = [
      {
        id: "evt-1",
        title: "Weekly Review",
        description: null,
        startAt: new Date("2024-06-03T15:00:00Z"),
        endAt: new Date("2024-06-03T16:00:00Z"),
        isAllDay: false,
        color: null,
        recurrenceRule: "DTSTART:20240603T150000Z\nRRULE:FREQ=WEEKLY;COUNT=4",
        sourceType: "STANDALONE",
        sourceTaskId: null,
      },
    ];

    const result = expandEvents(events, rangeStart, rangeEnd);
    expect(result).toHaveLength(4);
  });

  it("preserves event duration for recurring occurrences", () => {
    const events = [
      {
        id: "evt-1",
        title: "Long Meeting",
        description: null,
        startAt: new Date("2024-06-01T10:00:00Z"),
        endAt: new Date("2024-06-01T12:00:00Z"), // 2 hour duration
        isAllDay: false,
        color: null,
        recurrenceRule: "DTSTART:20240601T100000Z\nRRULE:FREQ=DAILY;COUNT=2",
        sourceType: "STANDALONE",
        sourceTaskId: null,
      },
    ];

    const result = expandEvents(events, rangeStart, rangeEnd);
    expect(result).toHaveLength(2);
    // Each occurrence should have the same 2-hour duration
    result.forEach((r) => {
      const startParts = r.start.split(" ")[1].split(":");
      const endParts = r.end.split(" ")[1].split(":");
      const startHour = parseInt(startParts[0]);
      const endHour = parseInt(endParts[0]);
      expect(endHour - startHour).toBe(2);
    });
  });
});
