// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import EditCalendarEventClient from "../EditCalendarEventClient";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockEvent = {
  id: "evt-1",
  originalEventId: "evt-1",
  title: "Test Event",
  description: "A test event",
  start: "2024-06-10 10:00",
  end: "2024-06-10 11:00",
  isAllDay: false,
  calendarId: "standalone",
  sourceType: "STANDALONE",
};

describe("EditCalendarEventClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "evt-1" }),
      })
    );
  });

  it("renders back link to /calendar", () => {
    render(<EditCalendarEventClient event={mockEvent} />);

    const backLink = screen.getByRole("link", { name: /calendar/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/calendar");
  });

  it("renders 'Edit Event' heading", () => {
    render(<EditCalendarEventClient event={mockEvent} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Edit Event" })
    ).toBeInTheDocument();
  });

  it("renders the form in edit mode with event data", () => {
    render(<EditCalendarEventClient event={mockEvent} />);

    expect(screen.getByText("Edit Event", { selector: "h3" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Event")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A test event")).toBeInTheDocument();
  });

  it("renders delete button", () => {
    render(<EditCalendarEventClient event={mockEvent} />);

    expect(screen.getByText("Delete this event")).toBeInTheDocument();
  });
});
