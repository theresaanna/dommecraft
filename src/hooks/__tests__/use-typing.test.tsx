// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useTyping } from "../use-typing";

type MessageHandler = (msg: { data: { userId: string; isTyping: boolean } }) => void;
const channelHandlers: Record<string, MessageHandler[]> = {};
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockPublish = vi.fn();

const mockChannelGet = vi.fn().mockReturnValue({
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
  publish: mockPublish,
});

let mockClient: object | null = null;

vi.mock("@/components/providers/ably-provider", () => ({
  useAbly: () => ({
    client: mockClient,
    isConnected: mockClient !== null,
  }),
}));

function TestConsumer({
  conversationId = "conv-1",
  currentUserId = "me",
}: {
  conversationId?: string;
  currentUserId?: string;
}) {
  const { isOtherTyping, onKeyStroke, onMessageSent } = useTyping(
    conversationId,
    currentUserId
  );
  return (
    <div>
      <span data-testid="is-typing">{String(isOtherTyping)}</span>
      <button data-testid="keystroke" onClick={onKeyStroke}>
        keystroke
      </button>
      <button data-testid="message-sent" onClick={onMessageSent}>
        sent
      </button>
    </div>
  );
}

describe("useTyping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockClient = null;
    for (const key of Object.keys(channelHandlers)) {
      delete channelHandlers[key];
    }
    mockSubscribe.mockImplementation(
      (event: string, handler: MessageHandler) => {
        if (!channelHandlers[event]) {
          channelHandlers[event] = [];
        }
        channelHandlers[event].push(handler);
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false for isOtherTyping initially", () => {
    mockClient = { channels: { get: mockChannelGet } };
    render(<TestConsumer />);
    expect(screen.getByTestId("is-typing").textContent).toBe("false");
  });

  it("does not subscribe when no client", () => {
    mockClient = null;
    render(<TestConsumer />);
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("subscribes to typing events on the correct channel", () => {
    mockClient = { channels: { get: mockChannelGet } };
    render(<TestConsumer conversationId="conv-42" />);
    expect(mockChannelGet).toHaveBeenCalledWith("chat:conv-42");
    expect(mockSubscribe).toHaveBeenCalledWith("typing", expect.any(Function));
  });

  it("sets isOtherTyping to true when other user starts typing", () => {
    mockClient = { channels: { get: mockChannelGet } };
    render(<TestConsumer currentUserId="me" />);

    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({ data: { userId: "other-user", isTyping: true } })
      );
    });

    expect(screen.getByTestId("is-typing").textContent).toBe("true");
  });

  it("ignores typing events from the current user", () => {
    mockClient = { channels: { get: mockChannelGet } };
    render(<TestConsumer currentUserId="me" />);

    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({ data: { userId: "me", isTyping: true } })
      );
    });

    expect(screen.getByTestId("is-typing").textContent).toBe("false");
  });

  it("sets isOtherTyping to false when other user stops typing", () => {
    mockClient = { channels: { get: mockChannelGet } };
    render(<TestConsumer />);

    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({ data: { userId: "other-user", isTyping: true } })
      );
    });
    expect(screen.getByTestId("is-typing").textContent).toBe("true");

    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({ data: { userId: "other-user", isTyping: false } })
      );
    });
    expect(screen.getByTestId("is-typing").textContent).toBe("false");
  });

  it("auto-expires typing after timeout", () => {
    mockClient = { channels: { get: mockChannelGet } };
    render(<TestConsumer />);

    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({ data: { userId: "other-user", isTyping: true } })
      );
    });
    expect(screen.getByTestId("is-typing").textContent).toBe("true");

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId("is-typing").textContent).toBe("false");
  });

  it("resets expiry timeout on repeated typing events", () => {
    mockClient = { channels: { get: mockChannelGet } };
    render(<TestConsumer />);

    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({ data: { userId: "other-user", isTyping: true } })
      );
    });

    // Advance 2 seconds (not yet expired)
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId("is-typing").textContent).toBe("true");

    // Another typing event resets the timer
    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({ data: { userId: "other-user", isTyping: true } })
      );
    });

    // Advance 2 more seconds (would have expired without the reset)
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId("is-typing").textContent).toBe("true");

    // Now wait until full timeout from last event
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("is-typing").textContent).toBe("false");
  });

  it("publishes typing start on first keystroke", () => {
    mockClient = { channels: { get: mockChannelGet } };
    render(<TestConsumer currentUserId="me" />);

    act(() => {
      screen.getByTestId("keystroke").click();
    });

    expect(mockPublish).toHaveBeenCalledWith("typing", {
      userId: "me",
      isTyping: true,
    });
  });

  it("does not publish duplicate start on rapid keystrokes", () => {
    mockClient = { channels: { get: mockChannelGet } };
    render(<TestConsumer currentUserId="me" />);

    act(() => {
      screen.getByTestId("keystroke").click();
    });
    act(() => {
      screen.getByTestId("keystroke").click();
    });
    act(() => {
      screen.getByTestId("keystroke").click();
    });

    const startCalls = mockPublish.mock.calls.filter(
      (call) => (call[1] as { isTyping: boolean }).isTyping === true
    );
    expect(startCalls).toHaveLength(1);
  });

  it("publishes typing stop after debounce period", () => {
    mockClient = { channels: { get: mockChannelGet } };
    render(<TestConsumer currentUserId="me" />);

    act(() => {
      screen.getByTestId("keystroke").click();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockPublish).toHaveBeenCalledWith("typing", {
      userId: "me",
      isTyping: false,
    });
  });

  it("resets debounce on continued keystrokes", () => {
    mockClient = { channels: { get: mockChannelGet } };
    render(<TestConsumer currentUserId="me" />);

    act(() => {
      screen.getByTestId("keystroke").click();
    });

    // Advance 800ms (before debounce)
    act(() => {
      vi.advanceTimersByTime(800);
    });

    // Another keystroke should reset the debounce
    act(() => {
      screen.getByTestId("keystroke").click();
    });

    // Advance another 800ms (1600ms total, but only 800ms from last keystroke)
    act(() => {
      vi.advanceTimersByTime(800);
    });

    // Should not have sent stop yet
    const stopCalls = mockPublish.mock.calls.filter(
      (call) => (call[1] as { isTyping: boolean }).isTyping === false
    );
    expect(stopCalls).toHaveLength(0);

    // Now advance to reach debounce from last keystroke
    act(() => {
      vi.advanceTimersByTime(200);
    });

    const stopCallsAfter = mockPublish.mock.calls.filter(
      (call) => (call[1] as { isTyping: boolean }).isTyping === false
    );
    expect(stopCallsAfter).toHaveLength(1);
  });

  it("sends stop and resets state on message sent", () => {
    mockClient = { channels: { get: mockChannelGet } };
    render(<TestConsumer currentUserId="me" />);

    // Start typing
    act(() => {
      screen.getByTestId("keystroke").click();
    });

    mockPublish.mockClear();

    // Send message
    act(() => {
      screen.getByTestId("message-sent").click();
    });

    expect(mockPublish).toHaveBeenCalledWith("typing", {
      userId: "me",
      isTyping: false,
    });

    // No debounce stop should fire after
    mockPublish.mockClear();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    const stopCalls = mockPublish.mock.calls.filter(
      (call) => (call[1] as { isTyping: boolean }).isTyping === false
    );
    expect(stopCalls).toHaveLength(0);
  });

  it("can start typing again after message sent", () => {
    mockClient = { channels: { get: mockChannelGet } };
    render(<TestConsumer currentUserId="me" />);

    // Type and send
    act(() => {
      screen.getByTestId("keystroke").click();
    });
    act(() => {
      screen.getByTestId("message-sent").click();
    });

    mockPublish.mockClear();

    // Type again
    act(() => {
      screen.getByTestId("keystroke").click();
    });

    expect(mockPublish).toHaveBeenCalledWith("typing", {
      userId: "me",
      isTyping: true,
    });
  });

  it("unsubscribes on unmount", () => {
    mockClient = { channels: { get: mockChannelGet } };
    const { unmount } = render(<TestConsumer />);

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledWith(
      "typing",
      expect.any(Function)
    );
  });

  it("publishes stop on unmount if currently typing", () => {
    mockClient = { channels: { get: mockChannelGet } };
    const { unmount } = render(<TestConsumer currentUserId="me" />);

    act(() => {
      screen.getByTestId("keystroke").click();
    });

    mockPublish.mockClear();

    unmount();

    expect(mockPublish).toHaveBeenCalledWith("typing", {
      userId: "me",
      isTyping: false,
    });
  });

  it("does not publish when no client", () => {
    mockClient = null;
    render(<TestConsumer />);

    act(() => {
      screen.getByTestId("keystroke").click();
    });

    expect(mockPublish).not.toHaveBeenCalled();
  });
});
