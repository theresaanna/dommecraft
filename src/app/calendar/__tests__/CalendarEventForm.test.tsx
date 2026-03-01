// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalendarEventForm from "../CalendarEventForm";

const mockRefresh = vi.fn();
const mockOnClose = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

describe("CalendarEventForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "evt-1",
            title: "Test Event",
          }),
      })
    );
  });

  it("renders all form fields", () => {
    render(<CalendarEventForm onClose={mockOnClose} />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/all-day/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/color/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/repeat/i)).toBeInTheDocument();
  });

  it("shows 'New Event' title for new events", () => {
    render(<CalendarEventForm onClose={mockOnClose} />);
    expect(screen.getByText("New Event")).toBeInTheDocument();
  });

  it("shows 'Edit Event' title when editing", () => {
    render(
      <CalendarEventForm
        event={{
          id: "evt-1",
          originalEventId: "evt-1",
          title: "Existing",
          description: null,
          start: "2024-06-10 10:00",
          end: "2024-06-10 11:00",
          isAllDay: false,
          calendarId: "standalone",
          sourceType: "STANDALONE",
        }}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByText("Edit Event")).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<CalendarEventForm onClose={mockOnClose} />);

    await user.click(screen.getByText("Cancel"));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("submits POST request for new event", async () => {
    const user = userEvent.setup();
    render(<CalendarEventForm onClose={mockOnClose} />);

    await user.type(screen.getByLabelText(/title/i), "New Meeting");
    // Set start date
    const startInput = screen.getByLabelText(/start/i);
    await user.clear(startInput);
    await user.type(startInput, "2024-06-10T10:00");

    await user.click(screen.getByText("Add Event"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/calendar/events",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  it("submits PATCH request when editing", async () => {
    const user = userEvent.setup();
    render(
      <CalendarEventForm
        event={{
          id: "evt-1",
          originalEventId: "evt-1",
          title: "Existing",
          description: null,
          start: "2024-06-10 10:00",
          end: "2024-06-10 11:00",
          isAllDay: false,
          calendarId: "standalone",
          sourceType: "STANDALONE",
        }}
        onClose={mockOnClose}
      />
    );

    await user.click(screen.getByText("Update Event"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/calendar/events/evt-1",
        expect.objectContaining({
          method: "PATCH",
        })
      );
    });
  });

  it("calls router.refresh and onClose after successful submit", async () => {
    const user = userEvent.setup();
    render(<CalendarEventForm onClose={mockOnClose} />);

    await user.type(screen.getByLabelText(/title/i), "New Meeting");
    const startInput = screen.getByLabelText(/start/i);
    await user.clear(startInput);
    await user.type(startInput, "2024-06-10T10:00");

    await user.click(screen.getByText("Add Event"));

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("shows error when API returns error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Title is required" }),
      })
    );

    const user = userEvent.setup();
    render(<CalendarEventForm onClose={mockOnClose} />);

    await user.type(screen.getByLabelText(/title/i), "Test");
    const startInput = screen.getByLabelText(/start/i);
    await user.clear(startInput);
    await user.type(startInput, "2024-06-10T10:00");

    await user.click(screen.getByText("Add Event"));

    await waitFor(() => {
      expect(screen.getByText("Title is required")).toBeInTheDocument();
    });
  });
});
