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

let reactionSubscribeCallback: ((msg: { data: unknown }) => void) | null = null;

const mockSubscribe = vi.fn().mockImplementation((event: string, cb: (msg: { data: unknown }) => void) => {
  if (event === "reaction") {
    reactionSubscribeCallback = cb;
  }
});
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

vi.mock("@/hooks/use-presence", () => ({
  usePresence: () => ({
    onlineUserIds: new Set<string>(),
    isOnline: () => false,
  }),
}));

vi.mock("@/components/providers/notification-provider", () => ({
  triggerNotificationRefresh: vi.fn(),
}));

const defaultProps = {
  conversationId: "conv-1",
  currentUserId: "user-1",
  currentUser: { name: "Me", avatarUrl: null },
  other: { id: "user-2", name: "Alice", avatarUrl: null, role: "SUB" as const },
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
  notificationSound: true,
};

const propsWithReactions = {
  ...defaultProps,
  initialMessages: [
    {
      id: "msg-1",
      senderId: "user-2",
      content: "Hey there!",
      createdAt: "2025-01-01T12:00:00.000Z",
      reactions: [
        { emoji: "👍", userId: "user-1" },
        { emoji: "👍", userId: "user-2" },
        { emoji: "❤️", userId: "user-2" },
      ],
    },
    {
      id: "msg-2",
      senderId: "user-1",
      content: "Hi Alice!",
      createdAt: "2025-01-01T12:01:00.000Z",
      reactions: [],
    },
  ],
};

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} />;
  },
}));

describe("ChatClient reactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reactionSubscribeCallback = null;
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    localStorage.clear();
  });

  it("displays reaction counts on messages with reactions", () => {
    render(<ChatClient {...propsWithReactions} />);

    // msg-1 has 2x 👍 and 1x ❤️
    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    expect(msg1).toBeTruthy();
    const reactions = within(msg1).getByTestId("reactions");
    expect(reactions).toBeInTheDocument();
    expect(within(reactions).getByText(/👍/)).toBeInTheDocument();
    expect(within(reactions).getByText(/2/)).toBeInTheDocument();
    expect(within(reactions).getByText(/❤️/)).toBeInTheDocument();
  });

  it("does not display reactions area when message has no reactions", () => {
    render(<ChatClient {...propsWithReactions} />);

    const msg2 = screen.getByText("Hi Alice!").closest("[data-message-id]") as HTMLElement;
    expect(msg2).toBeTruthy();
    const reactions = within(msg2).queryByTestId("reactions");
    expect(reactions).toBeNull();
  });

  it("highlights reactions that the current user has given", () => {
    render(<ChatClient {...propsWithReactions} />);

    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    const reactions = within(msg1).getByTestId("reactions");

    // user-1 reacted with 👍, so that button should be highlighted
    const thumbsUpButton = within(reactions).getByRole("button", { name: /👍/ });
    expect(thumbsUpButton.className).toContain("bg-");

    // user-1 did NOT react with ❤️
    const heartButton = within(reactions).getByRole("button", { name: /❤️/ });
    expect(heartButton.className).not.toEqual(thumbsUpButton.className);
  });

  it("shows an emoji picker trigger on message hover or interaction", async () => {
    const user = userEvent.setup();
    render(<ChatClient {...defaultProps} />);

    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    expect(msg1).toBeTruthy();

    // The add-reaction button should exist (may be hidden until hover, but present in DOM)
    const addReactionButton = within(msg1).getByRole("button", { name: /add reaction/i });
    expect(addReactionButton).toBeInTheDocument();
  });

  it("sends a POST request when adding a reaction", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "reaction-1",
          messageId: "msg-1",
          userId: "user-1",
          emoji: "👍",
        }),
    });
    global.fetch = mockFetch;

    render(<ChatClient {...defaultProps} />);

    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    const addReactionButton = within(msg1).getByRole("button", { name: /add reaction/i });
    await user.click(addReactionButton);

    // Select an emoji from the picker
    const emojiButton = screen.getByRole("button", { name: /👍/ });
    await user.click(emojiButton);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chat/conv-1/messages/msg-1/reactions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ emoji: "👍" }),
      })
    );
  });

  it("sends a DELETE request when removing own reaction", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    global.fetch = mockFetch;

    render(<ChatClient {...propsWithReactions} />);

    // user-1 already reacted with 👍 to msg-1, clicking it again should remove
    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    const reactions = within(msg1).getByTestId("reactions");
    const thumbsUpButton = within(reactions).getByRole("button", { name: /👍/ });
    await user.click(thumbsUpButton);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chat/conv-1/messages/msg-1/reactions",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ emoji: "👍" }),
      })
    );
  });

  it("optimistically updates reaction count when adding", async () => {
    const user = userEvent.setup();
    // Don't resolve fetch immediately to test optimistic update
    let resolveFetch: (value: unknown) => void;
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    render(<ChatClient {...propsWithReactions} />);

    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    const reactions = within(msg1).getByTestId("reactions");

    // user-1 has not reacted with ❤️ yet. Click it to add.
    const heartButton = within(reactions).getByRole("button", { name: /❤️/ });
    await user.click(heartButton);

    // Count should optimistically increase from 1 to 2
    expect(heartButton).toHaveTextContent(/2/);
  });

  it("optimistically updates reaction count when removing", async () => {
    const user = userEvent.setup();
    let resolveFetch: (value: unknown) => void;
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    render(<ChatClient {...propsWithReactions} />);

    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    const reactions = within(msg1).getByTestId("reactions");

    // user-1 has reacted with 👍. Click to remove.
    const thumbsUpButton = within(reactions).getByRole("button", { name: /👍/ });
    await user.click(thumbsUpButton);

    // Count should optimistically decrease from 2 to 1
    expect(thumbsUpButton).toHaveTextContent(/1/);
  });

  it("subscribes to reaction events on the Ably channel", () => {
    render(<ChatClient {...defaultProps} />);

    expect(mockSubscribe).toHaveBeenCalledWith("reaction", expect.any(Function));
  });

  it("updates reactions in real-time when receiving Ably reaction event", () => {
    render(<ChatClient {...defaultProps} />);

    // Simulate receiving a reaction event from Ably
    act(() => {
      reactionSubscribeCallback?.({
        data: {
          messageId: "msg-1",
          emoji: "🎉",
          userId: "user-2",
          action: "add",
        },
      });
    });

    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    const reactions = within(msg1).getByTestId("reactions");
    expect(within(reactions).getByText(/🎉/)).toBeInTheDocument();
  });

  it("removes reactions in real-time when receiving Ably removal event", () => {
    render(<ChatClient {...propsWithReactions} />);

    // Simulate the other user removing their 👍 from msg-1
    act(() => {
      reactionSubscribeCallback?.({
        data: {
          messageId: "msg-1",
          emoji: "👍",
          userId: "user-2",
          action: "remove",
        },
      });
    });

    // 👍 count should drop from 2 to 1
    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    const reactions = within(msg1).getByTestId("reactions");
    const thumbsUpButton = within(reactions).getByRole("button", { name: /👍/ });
    expect(thumbsUpButton).toHaveTextContent(/1/);
  });

  it("unsubscribes from reaction events on unmount", () => {
    const { unmount } = render(<ChatClient {...defaultProps} />);

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledWith(
      "reaction",
      expect.any(Function)
    );
  });

  it("shows quick reactions bar with emoji menu button when add reaction is clicked", async () => {
    const user = userEvent.setup();
    render(<ChatClient {...defaultProps} />);

    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    const addReactionButton = within(msg1).getByRole("button", { name: /add reaction/i });
    await user.click(addReactionButton);

    // Quick reactions bar should show
    expect(screen.getByTestId("quick-reactions")).toBeInTheDocument();

    // Should include the "open emoji menu" button
    expect(screen.getByRole("button", { name: /open emoji menu/i })).toBeInTheDocument();
  });

  it("opens the full emoji picker when emoji menu button is clicked", async () => {
    const user = userEvent.setup();
    render(<ChatClient {...defaultProps} />);

    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    const addReactionButton = within(msg1).getByRole("button", { name: /add reaction/i });
    await user.click(addReactionButton);

    const emojiMenuButton = screen.getByRole("button", { name: /open emoji menu/i });
    await user.click(emojiMenuButton);

    // Full emoji picker should be visible
    expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search emoji...")).toBeInTheDocument();

    // Quick reactions bar should be closed
    expect(screen.queryByTestId("quick-reactions")).toBeNull();
  });

  it("sends a POST request when selecting emoji from the full picker", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "reaction-1",
          messageId: "msg-1",
          userId: "user-1",
          emoji: "😀",
        }),
    });
    global.fetch = mockFetch;

    render(<ChatClient {...defaultProps} />);

    // Open quick reactions, then full picker
    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    const addReactionButton = within(msg1).getByRole("button", { name: /add reaction/i });
    await user.click(addReactionButton);

    const emojiMenuButton = screen.getByRole("button", { name: /open emoji menu/i });
    await user.click(emojiMenuButton);

    // Select an emoji from the full picker
    const picker = screen.getByTestId("emoji-picker");
    const smileysSection = within(picker).getByTestId("category-smileys");
    const firstEmoji = within(smileysSection).getAllByRole("option")[0];
    await user.click(firstEmoji);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chat/conv-1/messages/msg-1/reactions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ emoji: "😀" }),
      })
    );
  });

  it("closes the full emoji picker after selecting an emoji", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "r-1", messageId: "msg-1", userId: "user-1", emoji: "😀" }),
    });

    render(<ChatClient {...defaultProps} />);

    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    const addReactionButton = within(msg1).getByRole("button", { name: /add reaction/i });
    await user.click(addReactionButton);

    const emojiMenuButton = screen.getByRole("button", { name: /open emoji menu/i });
    await user.click(emojiMenuButton);

    expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();

    const picker = screen.getByTestId("emoji-picker");
    const smileysSection = within(picker).getByTestId("category-smileys");
    const firstEmoji = within(smileysSection).getAllByRole("option")[0];
    await user.click(firstEmoji);

    // Picker should close after selection
    expect(screen.queryByTestId("emoji-picker")).toBeNull();
  });

  it("can search for emoji in the full picker and react with the result", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "reaction-1",
          messageId: "msg-1",
          userId: "user-1",
          emoji: "🔥",
        }),
    });
    global.fetch = mockFetch;

    render(<ChatClient {...defaultProps} />);

    // Open quick reactions, then full picker
    const msg1 = screen.getByText("Hey there!").closest("[data-message-id]") as HTMLElement;
    const addReactionButton = within(msg1).getByRole("button", { name: /add reaction/i });
    await user.click(addReactionButton);

    const emojiMenuButton = screen.getByRole("button", { name: /open emoji menu/i });
    await user.click(emojiMenuButton);

    // Search for "fire"
    const searchInput = screen.getByPlaceholderText("Search emoji...");
    await user.type(searchInput, "fire");

    // Click the fire emoji from search results
    const fireEmoji = screen.getByRole("option", { name: "🔥" });
    await user.click(fireEmoji);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chat/conv-1/messages/msg-1/reactions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ emoji: "🔥" }),
      })
    );
  });
});
