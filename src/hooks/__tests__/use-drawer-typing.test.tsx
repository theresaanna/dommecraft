// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useDrawerTyping, type ConversationRef } from "../use-drawer-typing";

type TypingHandler = (msg: {
  data: { userId: string; userName?: string; isTyping: boolean };
}) => void;

const channelHandlers: Record<string, TypingHandler[]> = {};
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockChannelGet = vi.fn().mockReturnValue({
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
});

let mockClient: { channels: { get: typeof mockChannelGet }; auth: { clientId: string } } | null =
  null;

vi.mock("@/components/providers/ably-provider", () => ({
  useAbly: () => ({
    client: mockClient,
    isConnected: mockClient !== null,
  }),
}));

function TestConsumer({ conversations }: { conversations: ConversationRef[] }) {
  const { getTypingDisplay } = useDrawerTyping(conversations);
  return (
    <div>
      {conversations.map((c) => {
        const key = `${c.type}-${c.id}`;
        const display = getTypingDisplay(key);
        return (
          <span key={key} data-testid={`typing-${key}`}>
            {display || "none"}
          </span>
        );
      })}
    </div>
  );
}

describe("useDrawerTyping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockClient = null;
    for (const key of Object.keys(channelHandlers)) {
      delete channelHandlers[key];
    }
    mockSubscribe.mockImplementation(
      (event: string, handler: TypingHandler) => {
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

  it("returns null typing display initially", () => {
    mockClient = {
      channels: { get: mockChannelGet },
      auth: { clientId: "me" },
    };
    const convs: ConversationRef[] = [
      { id: "conv-1", type: "dm", otherName: "Bob" },
    ];
    render(<TestConsumer conversations={convs} />);

    expect(screen.getByTestId("typing-dm-conv-1").textContent).toBe("none");
  });

  it("does not subscribe when no client", () => {
    mockClient = null;
    const convs: ConversationRef[] = [
      { id: "conv-1", type: "dm", otherName: "Bob" },
    ];
    render(<TestConsumer conversations={convs} />);

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("does not subscribe with empty conversations", () => {
    mockClient = {
      channels: { get: mockChannelGet },
      auth: { clientId: "me" },
    };
    render(<TestConsumer conversations={[]} />);

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("subscribes to DM channels with chat: prefix", () => {
    mockClient = {
      channels: { get: mockChannelGet },
      auth: { clientId: "me" },
    };
    const convs: ConversationRef[] = [
      { id: "conv-1", type: "dm", otherName: "Bob" },
    ];
    render(<TestConsumer conversations={convs} />);

    expect(mockChannelGet).toHaveBeenCalledWith("chat:conv-1");
    expect(mockSubscribe).toHaveBeenCalledWith(
      "typing",
      expect.any(Function)
    );
  });

  it("subscribes to group channels with group: prefix", () => {
    mockClient = {
      channels: { get: mockChannelGet },
      auth: { clientId: "me" },
    };
    const convs: ConversationRef[] = [
      { id: "group-1", type: "group" },
    ];
    render(<TestConsumer conversations={convs} />);

    expect(mockChannelGet).toHaveBeenCalledWith("group:group-1");
  });

  it("subscribes to multiple channels", () => {
    mockClient = {
      channels: { get: mockChannelGet },
      auth: { clientId: "me" },
    };
    const convs: ConversationRef[] = [
      { id: "conv-1", type: "dm", otherName: "Bob" },
      { id: "group-1", type: "group" },
    ];
    render(<TestConsumer conversations={convs} />);

    expect(mockChannelGet).toHaveBeenCalledWith("chat:conv-1");
    expect(mockChannelGet).toHaveBeenCalledWith("group:group-1");
    expect(mockSubscribe).toHaveBeenCalledTimes(2);
  });

  it("shows typing display for DM using otherName", () => {
    mockClient = {
      channels: { get: mockChannelGet },
      auth: { clientId: "me" },
    };
    const convs: ConversationRef[] = [
      { id: "conv-1", type: "dm", otherName: "Bob" },
    ];
    render(<TestConsumer conversations={convs} />);

    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({ data: { userId: "other-user", isTyping: true } })
      );
    });

    expect(screen.getByTestId("typing-dm-conv-1").textContent).toBe(
      "Bob is typing..."
    );
  });

  it("shows typing display for group using userName from event", () => {
    mockClient = {
      channels: { get: mockChannelGet },
      auth: { clientId: "me" },
    };
    const convs: ConversationRef[] = [{ id: "group-1", type: "group" }];
    render(<TestConsumer conversations={convs} />);

    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({
          data: { userId: "other-user", userName: "Alice", isTyping: true },
        })
      );
    });

    expect(screen.getByTestId("typing-group-group-1").textContent).toBe(
      "Alice is typing..."
    );
  });

  it("clears typing display when user stops typing", () => {
    mockClient = {
      channels: { get: mockChannelGet },
      auth: { clientId: "me" },
    };
    const convs: ConversationRef[] = [
      { id: "conv-1", type: "dm", otherName: "Bob" },
    ];
    render(<TestConsumer conversations={convs} />);

    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({ data: { userId: "other-user", isTyping: true } })
      );
    });
    expect(screen.getByTestId("typing-dm-conv-1").textContent).toBe(
      "Bob is typing..."
    );

    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({ data: { userId: "other-user", isTyping: false } })
      );
    });
    expect(screen.getByTestId("typing-dm-conv-1").textContent).toBe("none");
  });

  it("auto-expires typing after timeout", () => {
    mockClient = {
      channels: { get: mockChannelGet },
      auth: { clientId: "me" },
    };
    const convs: ConversationRef[] = [
      { id: "conv-1", type: "dm", otherName: "Bob" },
    ];
    render(<TestConsumer conversations={convs} />);

    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({ data: { userId: "other-user", isTyping: true } })
      );
    });
    expect(screen.getByTestId("typing-dm-conv-1").textContent).toBe(
      "Bob is typing..."
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId("typing-dm-conv-1").textContent).toBe("none");
  });

  it("ignores typing events from current user", () => {
    mockClient = {
      channels: { get: mockChannelGet },
      auth: { clientId: "me" },
    };
    const convs: ConversationRef[] = [
      { id: "conv-1", type: "dm", otherName: "Bob" },
    ];
    render(<TestConsumer conversations={convs} />);

    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({ data: { userId: "me", isTyping: true } })
      );
    });

    expect(screen.getByTestId("typing-dm-conv-1").textContent).toBe("none");
  });

  it("shows two users typing in group", () => {
    mockClient = {
      channels: { get: mockChannelGet },
      auth: { clientId: "me" },
    };
    const convs: ConversationRef[] = [{ id: "group-1", type: "group" }];
    render(<TestConsumer conversations={convs} />);

    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({
          data: { userId: "user-a", userName: "Alice", isTyping: true },
        })
      );
    });
    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({
          data: { userId: "user-b", userName: "Bob", isTyping: true },
        })
      );
    });

    expect(screen.getByTestId("typing-group-group-1").textContent).toBe(
      "Alice and Bob are typing..."
    );
  });

  it("shows count when 3+ users typing in group", () => {
    mockClient = {
      channels: { get: mockChannelGet },
      auth: { clientId: "me" },
    };
    const convs: ConversationRef[] = [{ id: "group-1", type: "group" }];
    render(<TestConsumer conversations={convs} />);

    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({ data: { userId: "a", userName: "Alice", isTyping: true } })
      );
    });
    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({ data: { userId: "b", userName: "Bob", isTyping: true } })
      );
    });
    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({ data: { userId: "c", userName: "Charlie", isTyping: true } })
      );
    });

    expect(screen.getByTestId("typing-group-group-1").textContent).toBe(
      "3 people are typing..."
    );
  });

  it("uses 'Someone' when DM otherName is null", () => {
    mockClient = {
      channels: { get: mockChannelGet },
      auth: { clientId: "me" },
    };
    const convs: ConversationRef[] = [
      { id: "conv-1", type: "dm", otherName: null },
    ];
    render(<TestConsumer conversations={convs} />);

    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({ data: { userId: "other", isTyping: true } })
      );
    });

    expect(screen.getByTestId("typing-dm-conv-1").textContent).toBe(
      "Someone is typing..."
    );
  });

  it("unsubscribes on unmount", () => {
    mockClient = {
      channels: { get: mockChannelGet },
      auth: { clientId: "me" },
    };
    const convs: ConversationRef[] = [
      { id: "conv-1", type: "dm", otherName: "Bob" },
    ];
    const { unmount } = render(<TestConsumer conversations={convs} />);

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledWith(
      "typing",
      expect.any(Function)
    );
  });

  it("resets typing timeout on repeated typing events", () => {
    mockClient = {
      channels: { get: mockChannelGet },
      auth: { clientId: "me" },
    };
    const convs: ConversationRef[] = [
      { id: "conv-1", type: "dm", otherName: "Bob" },
    ];
    render(<TestConsumer conversations={convs} />);

    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({ data: { userId: "other", isTyping: true } })
      );
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId("typing-dm-conv-1").textContent).toBe(
      "Bob is typing..."
    );

    // Another typing event resets the timer
    act(() => {
      channelHandlers["typing"]?.forEach((h) =>
        h({ data: { userId: "other", isTyping: true } })
      );
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    // Should still be typing (only 2s since reset)
    expect(screen.getByTestId("typing-dm-conv-1").textContent).toBe(
      "Bob is typing..."
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // Now expired (3s since last event)
    expect(screen.getByTestId("typing-dm-conv-1").textContent).toBe("none");
  });
});
