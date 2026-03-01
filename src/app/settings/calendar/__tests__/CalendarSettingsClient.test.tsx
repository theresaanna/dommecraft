// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalendarSettingsClient from "../CalendarSettingsClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("CalendarSettingsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            message: "Google Calendar sync is not yet available. Coming soon.",
          }),
      })
    );
  });

  it("renders provider cards", () => {
    render(<CalendarSettingsClient calendars={[]} />);

    expect(screen.getByText("Google Calendar")).toBeInTheDocument();
    expect(screen.getByText("Apple Calendar")).toBeInTheDocument();
  });

  it("shows Connect buttons when no calendars connected", () => {
    render(<CalendarSettingsClient calendars={[]} />);

    const connectButtons = screen.getAllByText("Connect");
    expect(connectButtons).toHaveLength(2);
  });

  it("shows Connected badge for connected calendar", () => {
    render(
      <CalendarSettingsClient
        calendars={[
          {
            id: "cal-1",
            provider: "google",
            isActive: true,
            lastSyncAt: null,
            createdAt: "2024-06-01T00:00:00Z",
          },
        ]}
      />
    );

    expect(screen.getByText("Connected")).toBeInTheDocument();
    // Apple should still show Connect
    expect(screen.getByText("Connect")).toBeInTheDocument();
  });

  it("shows last sync time for connected calendar", () => {
    render(
      <CalendarSettingsClient
        calendars={[
          {
            id: "cal-1",
            provider: "google",
            isActive: true,
            lastSyncAt: "2024-06-15T10:00:00Z",
            createdAt: "2024-06-01T00:00:00Z",
          },
        ]}
      />
    );

    expect(screen.getByText(/Last synced/)).toBeInTheDocument();
  });

  it("shows 'Not yet synced' when lastSyncAt is null", () => {
    render(
      <CalendarSettingsClient
        calendars={[
          {
            id: "cal-1",
            provider: "google",
            isActive: true,
            lastSyncAt: null,
            createdAt: "2024-06-01T00:00:00Z",
          },
        ]}
      />
    );

    expect(screen.getByText("Not yet synced")).toBeInTheDocument();
  });

  it("shows message when connect is clicked", async () => {
    const user = userEvent.setup();
    render(<CalendarSettingsClient calendars={[]} />);

    const connectButtons = screen.getAllByText("Connect");
    await user.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/not yet available/i)).toBeInTheDocument();
    });
  });

  it("renders back link to settings", () => {
    render(<CalendarSettingsClient calendars={[]} />);
    expect(screen.getByText("← Settings")).toBeInTheDocument();
  });
});
