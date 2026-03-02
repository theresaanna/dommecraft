// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
    },
    {
      id: "msg-2",
      senderId: "user-1",
      content: "Hi Alice!",
      createdAt: "2025-01-01T12:01:00.000Z",
    },
  ],
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
});
