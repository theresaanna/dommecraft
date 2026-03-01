// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";
import "temporal-polyfill/global";
import {
  toScheduleXEvent,
  type CalendarEventData,
} from "../CalendarPageClient";

// --- Mocks for ScheduleX and Next.js ---
const mockSet = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@schedule-x/events-service", () => ({
  createEventsServicePlugin: () => ({ set: mockSet }),
}));

vi.mock("@schedule-x/calendar", () => ({
  createViewDay: vi.fn(),
  createViewWeek: vi.fn(),
  createViewMonthGrid: vi.fn(),
}));

vi.mock("@schedule-x/react", () => ({
  useNextCalendarApp: () => ({}),
  ScheduleXCalendar: () => <div data-testid="schedule-x-calendar" />,
}));

vi.mock("@schedule-x/theme-default/dist/index.css", () => ({}));

// --- toScheduleXEvent tests ---

describe("toScheduleXEvent", () => {
  it("converts a timed event to ZonedDateTime start/end", () => {
    const input: CalendarEventData = {
      id: "evt-1",
      title: "Team Meeting",
      description: "Weekly sync",
      start: "2024-06-10 10:00",
      end: "2024-06-10 11:00",
      calendarId: "standalone",
      isAllDay: false,
      sourceType: "STANDALONE",
      sourceTaskId: null,
      originalEventId: "evt-1",
    };

    const result = toScheduleXEvent(input);

    expect(result.id).toBe("evt-1");
    expect(result.title).toBe("Team Meeting");
    expect(result.description).toBe("Weekly sync");
    expect(result.calendarId).toBe("standalone");
    expect(result.sourceType).toBe("STANDALONE");
    expect(result.originalEventId).toBe("evt-1");
    expect(result.start).toBeInstanceOf(Temporal.ZonedDateTime);
    expect(result.end).toBeInstanceOf(Temporal.ZonedDateTime);
    expect((result.start as Temporal.ZonedDateTime).hour).toBe(10);
    expect((result.end as Temporal.ZonedDateTime).hour).toBe(11);
  });

  it("converts an all-day event to PlainDate start/end", () => {
    const input: CalendarEventData = {
      id: "evt-2",
      title: "Vacation",
      description: null,
      start: "2024-06-15",
      end: "2024-06-17",
      calendarId: "standalone",
      isAllDay: true,
      sourceType: "STANDALONE",
      sourceTaskId: null,
      originalEventId: "evt-2",
    };

    const result = toScheduleXEvent(input);

    expect(result.start).toBeInstanceOf(Temporal.PlainDate);
    expect(result.end).toBeInstanceOf(Temporal.PlainDate);
    expect((result.start as Temporal.PlainDate).toString()).toBe("2024-06-15");
    expect((result.end as Temporal.PlainDate).toString()).toBe("2024-06-17");
  });

  it("converts null description to undefined", () => {
    const input: CalendarEventData = {
      id: "evt-3",
      title: "Quick Event",
      description: null,
      start: "2024-06-10 14:00",
      end: "2024-06-10 15:00",
      calendarId: "task",
      isAllDay: false,
      sourceType: "TASK",
      sourceTaskId: "task-1",
      originalEventId: "evt-3",
    };

    const result = toScheduleXEvent(input);

    expect(result.description).toBeUndefined();
  });

  it("preserves non-null description", () => {
    const input: CalendarEventData = {
      id: "evt-4",
      title: "Reminder",
      description: "Don't forget!",
      start: "2024-06-10 09:00",
      end: "2024-06-10 09:30",
      calendarId: "reminder",
      isAllDay: false,
      sourceType: "REMINDER",
      sourceTaskId: null,
      originalEventId: "evt-4",
    };

    const result = toScheduleXEvent(input);

    expect(result.description).toBe("Don't forget!");
  });

  it("preserves sourceTaskId for task events", () => {
    const input: CalendarEventData = {
      id: "evt-5",
      title: "Task Deadline",
      description: null,
      start: "2024-06-20 17:00",
      end: "2024-06-20 18:00",
      calendarId: "task",
      isAllDay: false,
      sourceType: "TASK",
      sourceTaskId: "task-42",
      originalEventId: "evt-5",
    };

    const result = toScheduleXEvent(input);

    expect(result.sourceType).toBe("TASK");
  });
});

// --- CalendarPageClient component tests ---

describe("CalendarPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the calendar heading and navigation", async () => {
    const CalendarPageClient = (
      await import("../CalendarPageClient")
    ).default;
    render(<CalendarPageClient />);

    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.getByText("New Event")).toBeInTheDocument();
    expect(screen.getByText(/Dashboard/)).toBeInTheDocument();
  });

  it("renders the ScheduleX calendar component", async () => {
    const CalendarPageClient = (
      await import("../CalendarPageClient")
    ).default;
    render(<CalendarPageClient />);

    expect(screen.getByTestId("schedule-x-calendar")).toBeInTheDocument();
  });

  it("links back to dashboard", async () => {
    const CalendarPageClient = (
      await import("../CalendarPageClient")
    ).default;
    render(<CalendarPageClient />);

    const dashboardLink = screen.getByText(/Dashboard/);
    expect(dashboardLink.closest("a")).toHaveAttribute("href", "/dashboard");
  });

  it("links to new event page", async () => {
    const CalendarPageClient = (
      await import("../CalendarPageClient")
    ).default;
    render(<CalendarPageClient />);

    const newEventLink = screen.getByText("New Event");
    expect(newEventLink.closest("a")).toHaveAttribute("href", "/calendar/new");
  });

  it("fetches events on mount and populates eventsService", async () => {
    const mockEvents: CalendarEventData[] = [
      {
        id: "evt-1",
        title: "Meeting",
        description: null,
        start: "2024-06-10 10:00",
        end: "2024-06-10 11:00",
        calendarId: "standalone",
        isAllDay: false,
        sourceType: "STANDALONE",
        sourceTaskId: null,
        originalEventId: "evt-1",
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockEvents),
      })
    );

    const CalendarPageClient = (
      await import("../CalendarPageClient")
    ).default;
    render(<CalendarPageClient />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const fetchUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(fetchUrl).toContain("/api/calendar/events");
    expect(fetchUrl).toContain("start=");
    expect(fetchUrl).toContain("end=");

    await waitFor(() => {
      expect(mockSet).toHaveBeenCalled();
    });
  });

  it("handles API errors gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Forbidden" }),
      })
    );

    const CalendarPageClient = (
      await import("../CalendarPageClient")
    ).default;
    render(<CalendarPageClient />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Calendar API error:",
        "Forbidden"
      );
    });

    expect(mockSet).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("handles network errors gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error"))
    );

    const CalendarPageClient = (
      await import("../CalendarPageClient")
    ).default;
    render(<CalendarPageClient />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Calendar fetch error:",
        expect.any(Error)
      );
    });

    expect(mockSet).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
