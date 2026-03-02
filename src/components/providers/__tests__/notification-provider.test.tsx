// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import {
  NotificationProvider,
  useUnreadChats,
} from "@/components/providers/notification-provider";

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

const mockPlay = vi.fn();
vi.mock("@/hooks/use-notification-sound", () => ({
  useNotificationSound: () => ({ play: mockPlay }),
}));

// Ably mock: capture the subscribe callback so tests can simulate events
type AblyCallback = (msg: { data: unknown }) => void;
const ablySubscriptions: Record<string, AblyCallback> = {};
const mockAblyChannel = {
  subscribe: vi.fn((event: string, cb: AblyCallback) => {
    ablySubscriptions[event] = cb;
  }),
  unsubscribe: vi.fn(),
};
const mockAblyClient = {
  channels: {
    get: vi.fn(() => mockAblyChannel),
  },
};

vi.mock("@/components/providers/ably-provider", () => ({
  useAbly: () => ({ client: mockAblyClient, isConnected: true }),
}));

import { useSession } from "next-auth/react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUseSession = vi.mocked(useSession) as any;

// Short poll interval for tests
const TEST_POLL_INTERVAL = 100;

// Helper to render a child that reads unread chat context
function UnreadChatDisplay() {
  const { unreadChatCount, clearUnreadChats } = useUnreadChats();
  return (
    <div>
      <span data-testid="unread-count">{unreadChatCount}</span>
      <button onClick={clearUnreadChats}>Clear</button>
    </div>
  );
}

describe("NotificationProvider", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    // Reset ably subscriptions
    Object.keys(ablySubscriptions).forEach((k) => delete ablySubscriptions[k]);
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
      data: { user: { id: "user-1", notificationSound: true } },
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
      data: { user: { id: "user-1", notificationSound: true } },
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
      data: { user: { id: "user-1", notificationSound: true } },
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
      data: { user: { id: "user-1", notificationSound: true } },
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
      data: { user: { id: "user-1", notificationSound: true } },
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
      data: { user: { id: "user-1", notificationSound: true } },
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

  describe("Ably real-time notification channel", () => {
    it("subscribes to user-specific Ably notification channel", async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-42", notificationSound: true } },
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
        expect(mockAblyClient.channels.get).toHaveBeenCalledWith(
          "user-notifications:user-42"
        );
      });

      expect(mockAblyChannel.subscribe).toHaveBeenCalledWith(
        "notify",
        expect.any(Function)
      );
    });

    it("triggers an immediate poll when Ably notify event is received", async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", notificationSound: true } },
      });

      let callCount = 0;
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      render(
        <NotificationProvider pollInterval={60000}>
          <div>child</div>
        </NotificationProvider>
      );

      // Wait for initial poll
      await waitFor(() => {
        expect(callCount).toBe(1);
      });

      // Simulate Ably notify event
      await act(async () => {
        ablySubscriptions["notify"]?.({ data: { type: "CHAT_MESSAGE" } });
      });

      // Should have triggered another poll immediately
      await waitFor(() => {
        expect(callCount).toBe(2);
      });
    });

    it("unsubscribes from Ably channel on unmount", async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", notificationSound: true } },
      });
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const { unmount } = render(
        <NotificationProvider pollInterval={TEST_POLL_INTERVAL}>
          <div>child</div>
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(mockAblyChannel.subscribe).toHaveBeenCalled();
      });

      unmount();

      expect(mockAblyChannel.unsubscribe).toHaveBeenCalledWith(
        "notify",
        expect.any(Function)
      );
    });
  });

  describe("notification sound for chat messages", () => {
    it("plays notification sound for new CHAT_MESSAGE notifications", async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", notificationSound: true } },
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
                id: "chat-notif-1",
                message: "New message from Alice",
                linkUrl: "/chat/conv-1",
                type: "CHAT_MESSAGE",
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
          expect(mockPlay).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it("plays notification sound for new GROUP_CHAT_MESSAGE notifications", async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", notificationSound: true } },
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
                id: "group-notif-1",
                message: "New message from Bob in group",
                linkUrl: "/chat/group/grp-1",
                type: "GROUP_CHAT_MESSAGE",
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
          expect(mockPlay).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it("does not play notification sound for non-chat notifications", async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", notificationSound: true } },
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
                id: "task-notif-1",
                message: "New task assigned",
                linkUrl: "/tasks/1",
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

      // Wait for the toast to appear (proving the notification was processed)
      await waitFor(
        () => {
          expect(
            screen.getByText("New task assigned")
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Sound should not have been played for a non-chat notification
      expect(mockPlay).not.toHaveBeenCalled();
    });
  });

  describe("unread chat count context", () => {
    it("tracks unread chat notification count", async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", notificationSound: true } },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: "chat-1",
              message: "Message from Alice",
              linkUrl: "/chat/c1",
              type: "CHAT_MESSAGE",
            },
            {
              id: "chat-2",
              message: "Group message",
              linkUrl: "/chat/group/g1",
              type: "GROUP_CHAT_MESSAGE",
            },
            {
              id: "task-1",
              message: "New task",
              linkUrl: "/tasks/1",
              type: "TASK_ASSIGNED",
            },
          ]),
      });

      render(
        <NotificationProvider pollInterval={TEST_POLL_INTERVAL}>
          <UnreadChatDisplay />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("unread-count")).toHaveTextContent("2");
      });
    });

    it("starts with zero unread count", () => {
      mockUseSession.mockReturnValue({ data: null });

      render(
        <NotificationProvider>
          <UnreadChatDisplay />
        </NotificationProvider>
      );

      expect(screen.getByTestId("unread-count")).toHaveTextContent("0");
    });

    it("clearUnreadChats resets count and calls PATCH to mark all read", async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", notificationSound: true } },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: "chat-1",
              message: "Message from Alice",
              linkUrl: "/chat/c1",
              type: "CHAT_MESSAGE",
            },
          ]),
      });

      const { getByText } = render(
        <NotificationProvider pollInterval={TEST_POLL_INTERVAL}>
          <UnreadChatDisplay />
        </NotificationProvider>
      );

      // Wait for count to be 1
      await waitFor(() => {
        expect(screen.getByTestId("unread-count")).toHaveTextContent("1");
      });

      // Click clear button
      await act(async () => {
        getByText("Clear").click();
      });

      // Count should reset immediately
      expect(screen.getByTestId("unread-count")).toHaveTextContent("0");

      // Should have called PATCH to mark all as read
      expect(global.fetch).toHaveBeenCalledWith("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
    });

    it("updates unread count when new chat notifications arrive via Ably", async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", notificationSound: true } },
      });

      let callCount = 0;
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Initial poll: no notifications
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          });
        }
        // After Ably trigger: new chat notification
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "chat-new",
                message: "New message from Alice",
                linkUrl: "/chat/c1",
                type: "CHAT_MESSAGE",
              },
            ]),
        });
      });

      render(
        <NotificationProvider pollInterval={60000}>
          <UnreadChatDisplay />
        </NotificationProvider>
      );

      // Wait for initial poll (count = 0)
      await waitFor(() => {
        expect(callCount).toBe(1);
      });
      expect(screen.getByTestId("unread-count")).toHaveTextContent("0");

      // Simulate Ably notify event
      await act(async () => {
        ablySubscriptions["notify"]?.({ data: { type: "CHAT_MESSAGE" } });
      });

      // Should update count after re-poll
      await waitFor(() => {
        expect(screen.getByTestId("unread-count")).toHaveTextContent("1");
      });
    });
  });
});
