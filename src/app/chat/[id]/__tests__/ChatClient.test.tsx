// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatClient from "../ChatClient";

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockPublish = vi.fn();
const mockGet = vi.fn().mockReturnValue({
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
  publish: mockPublish,
});

vi.mock("@/components/providers/ably-provider", () => ({
  useAbly: () => ({
    client: {
      channels: { get: mockGet },
    },
    isConnected: true,
  }),
  PRESENCE_CHANNEL: "presence:global",
}));

const mockIsOnline = vi.fn().mockReturnValue(false);
vi.mock("@/hooks/use-presence", () => ({
  usePresence: () => ({
    onlineUserIds: new Set<string>(),
    isOnline: mockIsOnline,
  }),
}));

const defaultProps = {
  conversationId: "conv-1",
  currentUserId: "user-1",
  other: { id: "user-2", name: "Alice", avatarUrl: null },
  initialMessages: [
    {
      id: "msg-1",
      senderId: "user-2",
      content: "Hey there!",
      createdAt: "2025-01-01T12:00:00.000Z",
      reactions: [],
    },
    {
      id: "msg-2",
      senderId: "user-1",
      content: "Hi Alice!",
      createdAt: "2025-01-01T12:01:00.000Z",
      reactions: [],
    },
  ],
  initialOtherLastReadAt: null as string | null,
  showReadReceipts: true,
};

describe("ChatClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders the other participant name", () => {
    render(<ChatClient {...defaultProps} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders a back link to /chat", () => {
    render(<ChatClient {...defaultProps} />);

    const backLink = screen.getByText("← Back");
    expect(backLink).toHaveAttribute("href", "/chat");
  });

  it("renders initial messages", () => {
    render(<ChatClient {...defaultProps} />);

    expect(screen.getByText("Hey there!")).toBeInTheDocument();
    expect(screen.getByText("Hi Alice!")).toBeInTheDocument();
  });

  it("shows empty state when no messages", () => {
    render(<ChatClient {...defaultProps} initialMessages={[]} />);

    expect(
      screen.getByText("No messages yet. Say hello!")
    ).toBeInTheDocument();
  });

  it("subscribes to the Ably channel on mount", () => {
    render(<ChatClient {...defaultProps} />);

    expect(mockGet).toHaveBeenCalledWith("chat:conv-1");
    expect(mockSubscribe).toHaveBeenCalledWith("message", expect.any(Function));
  });

  it("unsubscribes from the Ably channel on unmount", () => {
    const { unmount } = render(<ChatClient {...defaultProps} />);

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledWith(
      "message",
      expect.any(Function)
    );
  });

  it("sends a message on form submit", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "msg-3",
          senderId: "user-1",
          content: "New message",
          createdAt: "2025-01-01T12:02:00.000Z",
        }),
    });
    global.fetch = mockFetch;

    render(<ChatClient {...defaultProps} />);

    const input = screen.getByPlaceholderText("Type a message...");
    await user.type(input, "New message");
    await user.click(screen.getByText("Send"));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chat/conv-1/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ content: "New message" }),
      })
    );
  });

  it("does not publish to Ably from the client (server handles it)", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "msg-3",
          senderId: "user-1",
          content: "Test",
          createdAt: "2025-01-01T12:02:00.000Z",
        }),
    });

    render(<ChatClient {...defaultProps} />);

    const input = screen.getByPlaceholderText("Type a message...");
    await user.type(input, "Test");
    await user.click(screen.getByText("Send"));

    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("clears input after sending", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "msg-3",
          senderId: "user-1",
          content: "Hi",
          createdAt: "2025-01-01T12:02:00.000Z",
        }),
    });

    render(<ChatClient {...defaultProps} />);

    const input = screen.getByPlaceholderText(
      "Type a message..."
    ) as HTMLInputElement;
    await user.type(input, "Hi");
    await user.click(screen.getByText("Send"));

    expect(input.value).toBe("");
  });

  it("disables send button when input is empty", () => {
    render(<ChatClient {...defaultProps} />);

    const sendButton = screen.getByText("Send");
    expect(sendButton).toBeDisabled();
  });

  it("shows online indicator when other user is online", () => {
    mockIsOnline.mockReturnValue(true);

    render(<ChatClient {...defaultProps} />);

    const indicator = screen.getByTestId("presence-indicator");
    expect(indicator.className).toContain("bg-green-500");
  });

  it("shows offline indicator when other user is offline", () => {
    mockIsOnline.mockReturnValue(false);

    render(<ChatClient {...defaultProps} />);

    const indicator = screen.getByTestId("presence-indicator");
    expect(indicator.className).toContain("bg-zinc-300");
    expect(indicator.className).not.toContain("bg-green-500");
  });

  // Read receipt tests
  it("subscribes to read events on mount", () => {
    render(<ChatClient {...defaultProps} />);

    expect(mockSubscribe).toHaveBeenCalledWith("read", expect.any(Function));
  });

  it("unsubscribes from read events on unmount", () => {
    const { unmount } = render(<ChatClient {...defaultProps} />);

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledWith(
      "read",
      expect.any(Function)
    );
  });

  it("displays Read indicator on the last read sent message", () => {
    render(
      <ChatClient
        {...defaultProps}
        initialOtherLastReadAt="2025-01-01T12:01:00.000Z"
      />
    );

    expect(screen.getByTestId("read-receipt")).toBeInTheDocument();
    expect(screen.getByText("Read")).toBeInTheDocument();
  });

  it("does not show Read indicator when no messages have been read", () => {
    render(
      <ChatClient
        {...defaultProps}
        initialOtherLastReadAt={null}
      />
    );

    expect(screen.queryByTestId("read-receipt")).not.toBeInTheDocument();
  });

  it("does not show Read indicator on received messages", () => {
    // otherLastReadAt covers the received message time but Read should only appear on sent messages
    render(
      <ChatClient
        {...defaultProps}
        initialMessages={[
          {
            id: "msg-1",
            senderId: "user-2",
            content: "Hey there!",
            createdAt: "2025-01-01T12:00:00.000Z",
            reactions: [],
          },
        ]}
        initialOtherLastReadAt="2025-01-01T12:00:00.000Z"
      />
    );

    expect(screen.queryByTestId("read-receipt")).not.toBeInTheDocument();
  });

  it("updates read indicator when Ably read event arrives", () => {
    render(
      <ChatClient
        {...defaultProps}
        initialOtherLastReadAt={null}
      />
    );

    // No read receipt initially
    expect(screen.queryByTestId("read-receipt")).not.toBeInTheDocument();

    // Simulate read event from Ably
    const readCallback = mockSubscribe.mock.calls.find(
      (call: unknown[]) => call[0] === "read"
    )?.[1];

    act(() => {
      readCallback({
        data: { userId: "user-2", readAt: "2025-01-01T12:01:00.000Z" },
      });
    });

    expect(screen.getByTestId("read-receipt")).toBeInTheDocument();
  });

  it("does not show read indicator when showReadReceipts is false", () => {
    render(
      <ChatClient
        {...defaultProps}
        initialOtherLastReadAt="2025-01-01T12:01:00.000Z"
        showReadReceipts={false}
      />
    );

    expect(screen.queryByTestId("read-receipt")).not.toBeInTheDocument();
  });

  it("calls mark-as-read API when receiving messages via Ably", () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;

    render(<ChatClient {...defaultProps} />);

    // Simulate incoming message from other user via Ably
    const messageCallback = mockSubscribe.mock.calls.find(
      (call: unknown[]) => call[0] === "message"
    )?.[1];

    act(() => {
      messageCallback({
        data: {
          id: "msg-3",
          senderId: "user-2",
          content: "New message from other user",
          createdAt: "2025-01-01T12:02:00.000Z",
          reactions: [],
        },
      });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chat/conv-1/read",
      { method: "POST" }
    );
  });

  it("does not call mark-as-read API when receiving own messages via Ably", () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;

    render(<ChatClient {...defaultProps} />);

    // Simulate incoming message from self via Ably (echo)
    const messageCallback = mockSubscribe.mock.calls.find(
      (call: unknown[]) => call[0] === "message"
    )?.[1];

    act(() => {
      messageCallback({
        data: {
          id: "msg-3",
          senderId: "user-1",
          content: "My own message echoed back",
          createdAt: "2025-01-01T12:02:00.000Z",
          reactions: [],
        },
      });
    });

    expect(mockFetch).not.toHaveBeenCalledWith(
      "/api/chat/conv-1/read",
      expect.anything()
    );
  });

  it("does not call mark-as-read when showReadReceipts is false", () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;

    render(<ChatClient {...defaultProps} showReadReceipts={false} />);

    // Simulate incoming message from other user via Ably
    const messageCallback = mockSubscribe.mock.calls.find(
      (call: unknown[]) => call[0] === "message"
    )?.[1];

    act(() => {
      messageCallback({
        data: {
          id: "msg-3",
          senderId: "user-2",
          content: "New message",
          createdAt: "2025-01-01T12:02:00.000Z",
          reactions: [],
        },
      });
    });

    expect(mockFetch).not.toHaveBeenCalledWith(
      "/api/chat/conv-1/read",
      expect.anything()
    );
  });
});
