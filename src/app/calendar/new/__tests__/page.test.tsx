// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import NewCalendarEventPageClient from "../NewCalendarEventPageClient";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

describe("NewCalendarEventPageClient", () => {
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
    render(<NewCalendarEventPageClient />);

    const backLink = screen.getByRole("link", { name: /calendar/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/calendar");
  });

  it("renders 'New Event' heading", () => {
    render(<NewCalendarEventPageClient />);

    expect(
      screen.getByRole("heading", { level: 1, name: "New Event" })
    ).toBeInTheDocument();
  });

  it("renders the calendar event form with required fields", () => {
    render(<NewCalendarEventPageClient />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/all-day/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/color/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/repeat/i)).toBeInTheDocument();
  });
});
