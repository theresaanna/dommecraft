// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, act } from "@testing-library/react";
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

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
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

  it("does not publish chat messages to Ably from the client (server handles it)", async () => {
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

    const messageCalls = mockPublish.mock.calls.filter(
      (call) => call[0] === "message"
    );
    expect(messageCalls).toHaveLength(0);
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

  // Media / file upload tests
  it("renders attach file button", () => {
    render(<ChatClient {...defaultProps} />);

    expect(screen.getByLabelText("Attach file")).toBeInTheDocument();
  });

  it("renders hidden file input with correct accept types", () => {
    render(<ChatClient {...defaultProps} />);

    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    expect(fileInput.type).toBe("file");
    expect(fileInput.accept).toContain("image/jpeg");
    expect(fileInput.accept).toContain("video/mp4");
  });

  it("shows file preview when file is selected", async () => {
    const user = userEvent.setup();
    render(<ChatClient {...defaultProps} />);

    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    const file = new File(["image data"], "photo.jpg", { type: "image/jpeg" });

    await user.upload(fileInput, file);

    expect(screen.getByTestId("file-preview")).toBeInTheDocument();
    expect(screen.getByText(/photo\.jpg/)).toBeInTheDocument();
  });

  it("clears selected file when remove button is clicked", async () => {
    const user = userEvent.setup();
    render(<ChatClient {...defaultProps} />);

    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    const file = new File(["image data"], "photo.jpg", { type: "image/jpeg" });

    await user.upload(fileInput, file);
    expect(screen.getByTestId("file-preview")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Remove file"));
    expect(screen.queryByTestId("file-preview")).not.toBeInTheDocument();
  });

  it("enables send button when file is selected even without text", async () => {
    const user = userEvent.setup();
    render(<ChatClient {...defaultProps} />);

    const sendButton = screen.getByText("Send");
    expect(sendButton).toBeDisabled();

    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    const file = new File(["image data"], "photo.jpg", { type: "image/jpeg" });
    await user.upload(fileInput, file);

    expect(sendButton).not.toBeDisabled();
  });

  it("sends file via FormData when file is selected", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "msg-3",
          senderId: "user-1",
          content: "",
          mediaUrl: "https://blob.example.com/photo.jpg",
          mediaMimeType: "image/jpeg",
          mediaFileSize: 1024,
          createdAt: "2025-01-01T12:02:00.000Z",
        }),
    });
    global.fetch = mockFetch;

    render(<ChatClient {...defaultProps} />);

    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    const file = new File(["image data"], "photo.jpg", { type: "image/jpeg" });
    await user.upload(fileInput, file);
    await user.click(screen.getByText("Send"));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chat/conv-1/messages",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      })
    );
  });

  it("displays upload error when server returns an error", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: "File rejected by content safety scan",
        }),
    });
    global.fetch = mockFetch;

    render(<ChatClient {...defaultProps} />);

    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    const file = new File(["image data"], "photo.jpg", { type: "image/jpeg" });
    await user.upload(fileInput, file);
    await user.click(screen.getByText("Send"));

    expect(screen.getByTestId("upload-error")).toBeInTheDocument();
    expect(
      screen.getByText("File rejected by content safety scan")
    ).toBeInTheDocument();
  });

  it("renders image media in messages", () => {
    render(
      <ChatClient
        {...defaultProps}
        initialMessages={[
          {
            id: "msg-1",
            senderId: "user-2",
            content: "Check this out",
            mediaUrl: "https://blob.example.com/photo.jpg",
            mediaMimeType: "image/jpeg",
            mediaFileSize: 1024,
            createdAt: "2025-01-01T12:00:00.000Z",
            reactions: [],
          },
        ]}
      />
    );

    const media = screen.getByTestId("chat-media");
    expect(media).toBeInTheDocument();
    const img = media.querySelector("img");
    expect(img).toHaveAttribute("src", "https://blob.example.com/photo.jpg");
    expect(screen.getByText("Check this out")).toBeInTheDocument();
  });

  it("renders video media in messages", () => {
    render(
      <ChatClient
        {...defaultProps}
        initialMessages={[
          {
            id: "msg-1",
            senderId: "user-2",
            content: "",
            mediaUrl: "https://blob.example.com/clip.mp4",
            mediaMimeType: "video/mp4",
            mediaFileSize: 5000,
            createdAt: "2025-01-01T12:00:00.000Z",
            reactions: [],
          },
        ]}
      />
    );

    const media = screen.getByTestId("chat-media");
    expect(media).toBeInTheDocument();
    const video = media.querySelector("video");
    expect(video).toHaveAttribute("src", "https://blob.example.com/clip.mp4");
    expect(video).toHaveAttribute("controls");
  });

  it("does not render media element for text-only messages", () => {
    render(<ChatClient {...defaultProps} />);

    expect(screen.queryByTestId("chat-media")).not.toBeInTheDocument();
  });

  it("renders media message received via Ably", () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    render(<ChatClient {...defaultProps} />);

    const messageCallback = mockSubscribe.mock.calls.find(
      (call: unknown[]) => call[0] === "message"
    )?.[1];

    act(() => {
      messageCallback({
        data: {
          id: "msg-3",
          senderId: "user-2",
          content: "",
          mediaUrl: "https://blob.example.com/photo.png",
          mediaMimeType: "image/png",
          mediaFileSize: 2048,
          createdAt: "2025-01-01T12:02:00.000Z",
          reactions: [],
        },
      });
    });

    const media = screen.getByTestId("chat-media");
    expect(media).toBeInTheDocument();
    const img = media.querySelector("img");
    expect(img).toHaveAttribute("src", "https://blob.example.com/photo.png");
  });

  // Message editing tests
  it("shows edit button on hover for own messages", () => {
    render(<ChatClient {...defaultProps} />);

    const editButtons = screen.getAllByLabelText("edit message");
    // Only own messages (msg-2 from user-1) should have edit button
    expect(editButtons).toHaveLength(1);
  });

  it("does not show edit button for other user's messages", () => {
    render(
      <ChatClient
        {...defaultProps}
        initialMessages={[
          {
            id: "msg-1",
            senderId: "user-2",
            content: "Their message",
            createdAt: "2025-01-01T12:00:00.000Z",
            reactions: [],
          },
        ]}
      />
    );

    expect(screen.queryByLabelText("edit message")).not.toBeInTheDocument();
  });

  it("shows edit form when edit button is clicked", async () => {
    const user = userEvent.setup();
    render(<ChatClient {...defaultProps} />);

    await user.click(screen.getByLabelText("edit message"));

    expect(screen.getByTestId("edit-form")).toBeInTheDocument();
    const editInput = screen.getByTestId("edit-input") as HTMLInputElement;
    expect(editInput.value).toBe("Hi Alice!");
  });

  it("cancels edit when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<ChatClient {...defaultProps} />);

    await user.click(screen.getByLabelText("edit message"));
    expect(screen.getByTestId("edit-form")).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));
    expect(screen.queryByTestId("edit-form")).not.toBeInTheDocument();
    expect(screen.getByText("Hi Alice!")).toBeInTheDocument();
  });

  it("saves edit and updates message content optimistically", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "msg-2",
          senderId: "user-1",
          content: "Edited message",
          editedAt: "2025-01-01T12:05:00.000Z",
          createdAt: "2025-01-01T12:01:00.000Z",
          reactions: [],
        }),
    });
    global.fetch = mockFetch;

    render(<ChatClient {...defaultProps} />);

    await user.click(screen.getByLabelText("edit message"));
    const editInput = screen.getByTestId("edit-input");
    await user.clear(editInput);
    await user.type(editInput, "Edited message");
    await user.click(screen.getByText("Save"));

    // Optimistic update: message should be updated immediately
    expect(screen.getByText("Edited message")).toBeInTheDocument();
    expect(screen.queryByText("Hi Alice!")).not.toBeInTheDocument();

    // Should call PUT endpoint
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chat/conv-1/messages/msg-2",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ content: "Edited message" }),
      })
    );
  });

  it("reverts edit when API returns error", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Forbidden" }),
    });
    global.fetch = mockFetch;

    render(<ChatClient {...defaultProps} />);

    await user.click(screen.getByLabelText("edit message"));
    const editInput = screen.getByTestId("edit-input");
    await user.clear(editInput);
    await user.type(editInput, "Bad edit");
    await user.click(screen.getByText("Save"));

    // Wait for revert
    expect(await screen.findByText("Hi Alice!")).toBeInTheDocument();
  });

  it("displays (edited) indicator when message has editedAt", () => {
    render(
      <ChatClient
        {...defaultProps}
        initialMessages={[
          {
            id: "msg-1",
            senderId: "user-1",
            content: "Edited message",
            editedAt: "2025-01-01T12:05:00.000Z",
            createdAt: "2025-01-01T12:00:00.000Z",
            reactions: [],
          },
        ]}
      />
    );

    expect(screen.getByTestId("edited-indicator")).toBeInTheDocument();
    expect(screen.getByText("(edited)")).toBeInTheDocument();
  });

  it("does not display (edited) indicator when editedAt is null", () => {
    render(<ChatClient {...defaultProps} />);

    expect(screen.queryByTestId("edited-indicator")).not.toBeInTheDocument();
  });

  it("subscribes to edit events on mount", () => {
    render(<ChatClient {...defaultProps} />);

    expect(mockSubscribe).toHaveBeenCalledWith("edit", expect.any(Function));
  });

  it("unsubscribes from edit events on unmount", () => {
    const { unmount } = render(<ChatClient {...defaultProps} />);

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledWith(
      "edit",
      expect.any(Function)
    );
  });

  it("updates message when edit event arrives via Ably", () => {
    render(<ChatClient {...defaultProps} />);

    const editCallback = mockSubscribe.mock.calls.find(
      (call: unknown[]) => call[0] === "edit"
    )?.[1];

    act(() => {
      editCallback({
        data: {
          id: "msg-1",
          senderId: "user-2",
          content: "Edited by other user",
          editedAt: "2025-01-01T12:05:00.000Z",
          createdAt: "2025-01-01T12:00:00.000Z",
          reactions: [],
        },
      });
    });

    expect(screen.getByText("Edited by other user")).toBeInTheDocument();
    expect(screen.queryByText("Hey there!")).not.toBeInTheDocument();
    expect(screen.getByTestId("edited-indicator")).toBeInTheDocument();
  });

  it("does not show edit form when content is unchanged and Save is clicked", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    render(<ChatClient {...defaultProps} />);

    await user.click(screen.getByLabelText("edit message"));
    // Don't change the content, just click Save
    await user.click(screen.getByText("Save"));

    // Should not call the API since content hasn't changed
    expect(mockFetch).not.toHaveBeenCalled();
    // Form should be closed
    expect(screen.queryByTestId("edit-form")).not.toBeInTheDocument();
  });

  // Reply tests
  it("shows reply button on all messages", () => {
    render(<ChatClient {...defaultProps} />);

    const replyButtons = screen.getAllByLabelText("reply to message");
    // Both messages (own and other's) should have reply buttons
    expect(replyButtons).toHaveLength(2);
  });

  it("displays reply preview in message bubble with sender name and content", () => {
    render(
      <ChatClient
        {...defaultProps}
        initialMessages={[
          {
            id: "msg-1",
            senderId: "user-2",
            content: "Original message",
            createdAt: "2025-01-01T12:00:00.000Z",
            reactions: [],
          },
          {
            id: "msg-2",
            senderId: "user-1",
            content: "This is a reply",
            createdAt: "2025-01-01T12:01:00.000Z",
            reactions: [],
            replyTo: {
              id: "msg-1",
              content: "Original message",
              senderName: "Alice",
            },
          },
        ]}
      />
    );

    const replyPreview = screen.getByTestId("reply-preview");
    expect(replyPreview).toBeInTheDocument();
    expect(replyPreview).toHaveTextContent("Alice");
    expect(replyPreview).toHaveTextContent("Original message");
  });

  it("truncates long reply preview content at 100 characters", () => {
    const longContent = "A".repeat(150);
    render(
      <ChatClient
        {...defaultProps}
        initialMessages={[
          {
            id: "msg-1",
            senderId: "user-1",
            content: "Reply",
            createdAt: "2025-01-01T12:00:00.000Z",
            reactions: [],
            replyTo: {
              id: "msg-0",
              content: longContent,
              senderName: "Alice",
            },
          },
        ]}
      />
    );

    const replyPreview = screen.getByTestId("reply-preview");
    expect(replyPreview).toHaveTextContent("A".repeat(100) + "...");
    expect(replyPreview).not.toHaveTextContent("A".repeat(101));
  });

  it("shows [Media] in reply preview when original message has no content", () => {
    render(
      <ChatClient
        {...defaultProps}
        initialMessages={[
          {
            id: "msg-1",
            senderId: "user-1",
            content: "Reply to image",
            createdAt: "2025-01-01T12:00:00.000Z",
            reactions: [],
            replyTo: {
              id: "msg-0",
              content: "",
              senderName: "Alice",
            },
          },
        ]}
      />
    );

    const replyPreview = screen.getByTestId("reply-preview");
    expect(replyPreview).toHaveTextContent("[Media]");
  });

  it("does not show reply preview when replyTo is null", () => {
    render(<ChatClient {...defaultProps} />);

    expect(screen.queryByTestId("reply-preview")).not.toBeInTheDocument();
  });

  it("shows reply compose bar when Reply button is clicked", async () => {
    const user = userEvent.setup();
    render(<ChatClient {...defaultProps} />);

    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    const replyButton = within(msg1).getByLabelText("reply to message");
    await user.click(replyButton);

    const composeBar = screen.getByTestId("reply-compose-bar");
    expect(composeBar).toBeInTheDocument();
    expect(composeBar).toHaveTextContent("Replying to");
    expect(composeBar).toHaveTextContent("Alice");
    expect(composeBar).toHaveTextContent("Hey there!");
  });

  it("shows 'yourself' in reply compose bar when replying to own message", async () => {
    const user = userEvent.setup();
    render(<ChatClient {...defaultProps} />);

    const msg2 = screen.getByText("Hi Alice!").closest("[data-message-id]") as HTMLElement;
    const replyButton = within(msg2).getByLabelText("reply to message");
    await user.click(replyButton);

    const composeBar = screen.getByTestId("reply-compose-bar");
    expect(composeBar).toHaveTextContent("yourself");
  });

  it("cancels reply when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<ChatClient {...defaultProps} />);

    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    const replyButton = within(msg1).getByLabelText("reply to message");
    await user.click(replyButton);

    expect(screen.getByTestId("reply-compose-bar")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Cancel reply"));

    expect(screen.queryByTestId("reply-compose-bar")).not.toBeInTheDocument();
  });

  it("sends replyToId in fetch body when replying", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "msg-3",
          senderId: "user-1",
          content: "My reply",
          createdAt: "2025-01-01T12:02:00.000Z",
          reactions: [],
          replyTo: {
            id: "msg-1",
            content: "Hey there!",
            senderName: "Alice",
          },
        }),
    });
    global.fetch = mockFetch;

    render(<ChatClient {...defaultProps} />);

    // Click reply on the first message
    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    const replyButton = within(msg1).getByLabelText("reply to message");
    await user.click(replyButton);

    // Type and send
    const input = screen.getByPlaceholderText("Type a message...");
    await user.type(input, "My reply");
    await user.click(screen.getByText("Send"));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chat/conv-1/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ content: "My reply", replyToId: "msg-1" }),
      })
    );
  });

  it("clears reply compose bar after sending", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "msg-3",
          senderId: "user-1",
          content: "My reply",
          createdAt: "2025-01-01T12:02:00.000Z",
          reactions: [],
        }),
    });

    render(<ChatClient {...defaultProps} />);

    // Click reply
    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    const replyButton = within(msg1).getByLabelText("reply to message");
    await user.click(replyButton);

    expect(screen.getByTestId("reply-compose-bar")).toBeInTheDocument();

    // Send message
    const input = screen.getByPlaceholderText("Type a message...");
    await user.type(input, "My reply");
    await user.click(screen.getByText("Send"));

    // Compose bar should be cleared
    expect(screen.queryByTestId("reply-compose-bar")).not.toBeInTheDocument();
  });

  it("truncates reply compose bar content at 80 characters", async () => {
    const user = userEvent.setup();
    const longContent = "B".repeat(120);
    render(
      <ChatClient
        {...defaultProps}
        initialMessages={[
          {
            id: "msg-1",
            senderId: "user-2",
            content: longContent,
            createdAt: "2025-01-01T12:00:00.000Z",
            reactions: [],
          },
        ]}
      />
    );

    const msg1 = screen.getByText(longContent).closest("[data-message-id]") as HTMLElement;
    const replyButton = within(msg1).getByLabelText("reply to message");
    await user.click(replyButton);

    const composeBar = screen.getByTestId("reply-compose-bar");
    expect(composeBar).toHaveTextContent("B".repeat(80) + "...");
  });

  it("includes replyTo data from Ably message events", () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    render(<ChatClient {...defaultProps} />);

    const messageCallback = mockSubscribe.mock.calls.find(
      (call: unknown[]) => call[0] === "message"
    )?.[1];

    act(() => {
      messageCallback({
        data: {
          id: "msg-3",
          senderId: "user-2",
          content: "A reply via Ably",
          createdAt: "2025-01-01T12:02:00.000Z",
          reactions: [],
          replyTo: {
            id: "msg-1",
            content: "Hey there!",
            senderName: "Alice",
          },
        },
      });
    });

    const replyPreview = screen.getByTestId("reply-preview");
    expect(replyPreview).toHaveTextContent("Alice");
    expect(replyPreview).toHaveTextContent("Hey there!");
  });

  it("sends replyToId in FormData when replying with a file", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "msg-3",
          senderId: "user-1",
          content: "",
          mediaUrl: "https://blob.example.com/photo.jpg",
          mediaMimeType: "image/jpeg",
          mediaFileSize: 1024,
          createdAt: "2025-01-01T12:02:00.000Z",
          reactions: [],
          replyTo: {
            id: "msg-1",
            content: "Hey there!",
            senderName: "Alice",
          },
        }),
    });
    global.fetch = mockFetch;

    render(<ChatClient {...defaultProps} />);

    // Click reply on msg-1
    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    const replyButton = within(msg1).getByLabelText("reply to message");
    await user.click(replyButton);

    // Select a file and send
    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    const file = new File(["image data"], "photo.jpg", { type: "image/jpeg" });
    await user.upload(fileInput, file);
    await user.click(screen.getByText("Send"));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chat/conv-1/messages",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      })
    );

    // Check that FormData includes replyToId
    const callBody = mockFetch.mock.calls[0][1].body as FormData;
    expect(callBody.get("replyToId")).toBe("msg-1");
    expect(callBody.get("file")).toBeTruthy();
  });
});
