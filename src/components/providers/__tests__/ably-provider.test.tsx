// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AblyProvider, useAbly } from "../ably-provider";

// Track connection event handlers registered by AblyProvider
type ConnectionHandler = (stateChange: { current: string }) => void;
const connectionHandlers: Record<string, ConnectionHandler[]> = {};
const mockClose = vi.fn();

vi.mock("ably", () => ({
  default: {
    Realtime: vi.fn().mockImplementation(() => ({
      connection: {
        on: vi.fn(
          (event: string, handler: ConnectionHandler) => {
            if (!connectionHandlers[event]) {
              connectionHandlers[event] = [];
            }
            connectionHandlers[event].push(handler);
          }
        ),
      },
      close: mockClose,
    })),
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "next-auth/react";

const mockUseSession = vi.mocked(useSession);

function TestConsumer() {
  const { client, isConnected } = useAbly();
  return (
    <div>
      <span data-testid="connected">{String(isConnected)}</span>
      <span data-testid="has-client">{String(client !== null)}</span>
    </div>
  );
}

describe("AblyProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear tracked handlers
    for (const key of Object.keys(connectionHandlers)) {
      delete connectionHandlers[key];
    }

    // Mock fetch for token requests
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          keyName: "test-key",
          clientId: "user-1",
          nonce: "abc",
          mac: "sig",
        }),
    });
  });

  it("does not create a client when there is no session", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(
      <AblyProvider>
        <TestConsumer />
      </AblyProvider>
    );

    expect(screen.getByTestId("has-client").textContent).toBe("false");
    expect(screen.getByTestId("connected").textContent).toBe("false");
  });

  it("creates and exposes a client immediately when session exists", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "" } as never,
      status: "authenticated",
      update: vi.fn(),
    });

    render(
      <AblyProvider>
        <TestConsumer />
      </AblyProvider>
    );

    // Client is available via state immediately after useEffect runs,
    // before the "connected" event fires (Ably queues subscriptions)
    expect(screen.getByTestId("has-client").textContent).toBe("true");
    expect(screen.getByTestId("connected").textContent).toBe("false");
  });

  it("sets isConnected to true on connected event", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "" } as never,
      status: "authenticated",
      update: vi.fn(),
    });

    render(
      <AblyProvider>
        <TestConsumer />
      </AblyProvider>
    );

    // Simulate the Ably client emitting "connected"
    act(() => {
      connectionHandlers["connected"]?.forEach((handler) =>
        handler({ current: "connected" })
      );
    });

    expect(screen.getByTestId("connected").textContent).toBe("true");
  });

  it("sets isConnected to false on disconnected event", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "" } as never,
      status: "authenticated",
      update: vi.fn(),
    });

    render(
      <AblyProvider>
        <TestConsumer />
      </AblyProvider>
    );

    // First connect, then disconnect
    act(() => {
      connectionHandlers["connected"]?.forEach((handler) =>
        handler({ current: "connected" })
      );
    });
    expect(screen.getByTestId("connected").textContent).toBe("true");

    act(() => {
      connectionHandlers["disconnected"]?.forEach((handler) =>
        handler({ current: "disconnected" })
      );
    });
    expect(screen.getByTestId("connected").textContent).toBe("false");
  });

  it("sets isConnected to false on failed event", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "" } as never,
      status: "authenticated",
      update: vi.fn(),
    });

    render(
      <AblyProvider>
        <TestConsumer />
      </AblyProvider>
    );

    act(() => {
      connectionHandlers["connected"]?.forEach((handler) =>
        handler({ current: "connected" })
      );
    });

    act(() => {
      connectionHandlers["failed"]?.forEach((handler) =>
        handler({ current: "failed" })
      );
    });

    expect(screen.getByTestId("connected").textContent).toBe("false");
  });

  it("closes the client on unmount", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "" } as never,
      status: "authenticated",
      update: vi.fn(),
    });

    const { unmount } = render(
      <AblyProvider>
        <TestConsumer />
      </AblyProvider>
    );

    unmount();

    expect(mockClose).toHaveBeenCalled();
  });

  it("does not create a client when session user has no id", () => {
    mockUseSession.mockReturnValue({
      data: { user: {}, expires: "" } as never,
      status: "authenticated",
      update: vi.fn(),
    });

    render(
      <AblyProvider>
        <TestConsumer />
      </AblyProvider>
    );

    expect(screen.getByTestId("has-client").textContent).toBe("false");
  });
});
