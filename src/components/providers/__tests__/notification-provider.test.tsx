// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NotificationProvider } from "@/components/providers/notification-provider";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

import { useSession } from "next-auth/react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUseSession = vi.mocked(useSession) as any;

// Short poll interval for tests
const TEST_POLL_INTERVAL = 100;

describe("NotificationProvider", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders children", () => {
    mockUseSession.mockReturnValue({ data: null });

    render(
      <NotificationProvider>
        <div>child content</div>
      </NotificationProvider>
    );

    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("does not poll when no session", () => {
    mockUseSession.mockReturnValue({ data: null });

    render(
      <NotificationProvider>
        <div>child</div>
      </NotificationProvider>
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("polls for notifications when session exists", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" } },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(
      <NotificationProvider pollInterval={TEST_POLL_INTERVAL}>
        <div>child</div>
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/notifications");
    });
  });

  it("does not show toasts on initial load (seeds seenIds)", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" } },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: "notif-1",
            message: "Existing notification",
            linkUrl: "/tasks/1",
            type: "TASK_ASSIGNED",
          },
        ]),
    });

    render(
      <NotificationProvider pollInterval={TEST_POLL_INTERVAL}>
        <div>child</div>
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Should NOT show a toast for the initial load notification
    expect(screen.queryByText("Existing notification")).not.toBeInTheDocument();
  });

  it("shows toast for new notifications on subsequent polls", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" } },
    });

    let callCount = 0;
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: "notif-new",
              message: "New task assigned: Clean room",
              linkUrl: "/my-tasks/1",
              type: "TASK_ASSIGNED",
            },
          ]),
      });
    });

    render(
      <NotificationProvider pollInterval={TEST_POLL_INTERVAL}>
        <div>child</div>
      </NotificationProvider>
    );

    await waitFor(
      () => {
        expect(
          screen.getByText("New task assigned: Clean room")
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("does not show duplicate toasts for already-seen notifications", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" } },
    });

    const notification = {
      id: "notif-1",
      message: "Task assigned",
      linkUrl: "/tasks/1",
      type: "TASK_ASSIGNED",
    };

    let callCount = 0;
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([notification]),
      });
    });

    render(
      <NotificationProvider pollInterval={TEST_POLL_INTERVAL}>
        <div>child</div>
      </NotificationProvider>
    );

    // Wait for at least 3 polls
    await waitFor(
      () => {
        expect(callCount).toBeGreaterThanOrEqual(3);
      },
      { timeout: 3000 }
    );

    // Should not show a toast since it was seeded on first load
    expect(screen.queryByText("Task assigned")).not.toBeInTheDocument();
  });

  it("handles fetch errors gracefully", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" } },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );

    render(
      <NotificationProvider pollInterval={TEST_POLL_INTERVAL}>
        <div>child</div>
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("handles non-ok responses gracefully", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" } },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
    });

    render(
      <NotificationProvider pollInterval={TEST_POLL_INTERVAL}>
        <div>child</div>
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(screen.getByText("child")).toBeInTheDocument();
  });
});
