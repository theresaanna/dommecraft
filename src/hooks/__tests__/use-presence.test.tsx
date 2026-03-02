// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { usePresence } from "../use-presence";

type PresenceHandler = (member: { clientId: string }) => void;
const presenceHandlers: Record<string, PresenceHandler[]> = {};
const mockPresenceGet = vi.fn();
const mockPresenceSubscribe = vi.fn();
const mockPresenceUnsubscribe = vi.fn();

const mockChannelGet = vi.fn().mockReturnValue({
  presence: {
    get: mockPresenceGet,
    subscribe: mockPresenceSubscribe,
    unsubscribe: mockPresenceUnsubscribe,
  },
});

let mockClient: object | null = null;

vi.mock("@/components/providers/ably-provider", () => ({
  useAbly: () => ({
    client: mockClient,
    isConnected: mockClient !== null,
  }),
  PRESENCE_CHANNEL: "presence:global",
}));

function TestConsumer() {
  const { onlineUserIds, isOnline } = usePresence();
  return (
    <div>
      <span data-testid="online-count">{onlineUserIds.size}</span>
      <span data-testid="user-1-online">{String(isOnline("user-1"))}</span>
      <span data-testid="user-2-online">{String(isOnline("user-2"))}</span>
    </div>
  );
}

describe("usePresence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = null;
    for (const key of Object.keys(presenceHandlers)) {
      delete presenceHandlers[key];
    }
    mockPresenceGet.mockResolvedValue([]);
    mockPresenceSubscribe.mockImplementation(
      (event: string, handler: PresenceHandler) => {
        if (!presenceHandlers[event]) {
          presenceHandlers[event] = [];
        }
        presenceHandlers[event].push(handler);
      }
    );
  });

  it("returns empty set when no Ably client", () => {
    mockClient = null;

    render(<TestConsumer />);

    expect(screen.getByTestId("online-count").textContent).toBe("0");
    expect(screen.getByTestId("user-1-online").textContent).toBe("false");
  });

  it("calls presence.get on mount and populates initial online users", async () => {
    mockPresenceGet.mockResolvedValue([
      { clientId: "user-1" },
      { clientId: "user-2" },
    ]);
    mockClient = { channels: { get: mockChannelGet } };

    render(<TestConsumer />);

    // Wait for the async presence.get to resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockChannelGet).toHaveBeenCalledWith("presence:global");
    expect(mockPresenceGet).toHaveBeenCalled();
    expect(screen.getByTestId("online-count").textContent).toBe("2");
    expect(screen.getByTestId("user-1-online").textContent).toBe("true");
    expect(screen.getByTestId("user-2-online").textContent).toBe("true");
  });

  it("adds user to set on enter event", async () => {
    mockPresenceGet.mockResolvedValue([]);
    mockClient = { channels: { get: mockChannelGet } };

    render(<TestConsumer />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("online-count").textContent).toBe("0");

    act(() => {
      presenceHandlers["enter"]?.forEach((h) =>
        h({ clientId: "user-1" })
      );
    });

    expect(screen.getByTestId("online-count").textContent).toBe("1");
    expect(screen.getByTestId("user-1-online").textContent).toBe("true");
  });

  it("removes user from set on leave event", async () => {
    mockPresenceGet.mockResolvedValue([{ clientId: "user-1" }]);
    mockClient = { channels: { get: mockChannelGet } };

    render(<TestConsumer />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("user-1-online").textContent).toBe("true");

    act(() => {
      presenceHandlers["leave"]?.forEach((h) =>
        h({ clientId: "user-1" })
      );
    });

    expect(screen.getByTestId("user-1-online").textContent).toBe("false");
    expect(screen.getByTestId("online-count").textContent).toBe("0");
  });

  it("subscribes to enter and leave events", async () => {
    mockClient = { channels: { get: mockChannelGet } };

    render(<TestConsumer />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockPresenceSubscribe).toHaveBeenCalledWith(
      "enter",
      expect.any(Function)
    );
    expect(mockPresenceSubscribe).toHaveBeenCalledWith(
      "leave",
      expect.any(Function)
    );
  });

  it("cleans up subscriptions on unmount", async () => {
    mockClient = { channels: { get: mockChannelGet } };

    const { unmount } = render(<TestConsumer />);

    await act(async () => {
      await Promise.resolve();
    });

    unmount();

    expect(mockPresenceUnsubscribe).toHaveBeenCalledWith(
      "enter",
      expect.any(Function)
    );
    expect(mockPresenceUnsubscribe).toHaveBeenCalledWith(
      "leave",
      expect.any(Function)
    );
  });

  it("isOnline returns false for unknown users", async () => {
    mockPresenceGet.mockResolvedValue([{ clientId: "user-1" }]);
    mockClient = { channels: { get: mockChannelGet } };

    render(<TestConsumer />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("user-1-online").textContent).toBe("true");
    expect(screen.getByTestId("user-2-online").textContent).toBe("false");
  });
});
