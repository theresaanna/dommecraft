// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatDrawer from "../ChatDrawer";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

const mockIsOnline = vi.fn().mockReturnValue(false);
vi.mock("@/hooks/use-presence", () => ({
  usePresence: () => ({
    onlineUserIds: new Set<string>(),
    isOnline: mockIsOnline,
  }),
}));

const baseConversation = {
  id: "conv-1",
  other: { id: "user-2", name: "Bob", avatarUrl: null },
  lastMessage: {
    content: "Hello!",
    createdAt: new Date().toISOString(),
    senderId: "user-2",
  },
  updatedAt: new Date().toISOString(),
};

function mockFetchSuccess(conversations = [baseConversation]) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(conversations),
  });
}

function mockFetchError() {
  global.fetch = vi.fn().mockResolvedValue({ ok: false });
}

describe("ChatDrawer", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("is hidden when closed", () => {
    render(<ChatDrawer open={false} onClose={onClose} />);

    const drawer = screen.getByTestId("chat-drawer");
    expect(drawer.className).toContain("translate-y-full");
  });

  it("is visible when open", () => {
    mockFetchSuccess();
    render(<ChatDrawer open={true} onClose={onClose} />);

    const drawer = screen.getByTestId("chat-drawer");
    expect(drawer.className).toContain("translate-y-0");
  });

  it("shows backdrop when open", () => {
    mockFetchSuccess();
    render(<ChatDrawer open={true} onClose={onClose} />);

    expect(screen.getByTestId("chat-drawer-backdrop")).toBeInTheDocument();
  });

  it("does not show backdrop when closed", () => {
    render(<ChatDrawer open={false} onClose={onClose} />);

    expect(
      screen.queryByTestId("chat-drawer-backdrop")
    ).not.toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", async () => {
    mockFetchSuccess();
    const user = userEvent.setup();
    render(<ChatDrawer open={true} onClose={onClose} />);

    await user.click(screen.getByTestId("chat-drawer-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when close button is clicked", async () => {
    mockFetchSuccess();
    const user = userEvent.setup();
    render(<ChatDrawer open={true} onClose={onClose} />);

    await user.click(screen.getByLabelText("Close chat drawer"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape key is pressed", () => {
    mockFetchSuccess();
    render(<ChatDrawer open={true} onClose={onClose} />);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onClose on Escape when closed", () => {
    render(<ChatDrawer open={false} onClose={onClose} />);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("fetches conversations when opened", () => {
    mockFetchSuccess();
    render(<ChatDrawer open={true} onClose={onClose} />);

    expect(global.fetch).toHaveBeenCalledWith("/api/chat");
  });

  it("does not fetch conversations when closed", () => {
    render(<ChatDrawer open={false} onClose={onClose} />);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows loading state while fetching", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    render(<ChatDrawer open={true} onClose={onClose} />);

    expect(screen.getByTestId("chat-drawer-loading")).toBeInTheDocument();
  });

  it("displays conversations after loading", async () => {
    mockFetchSuccess();
    render(<ChatDrawer open={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });
    expect(screen.getByText("Hello!")).toBeInTheDocument();
  });

  it("shows empty state when no conversations", async () => {
    mockFetchSuccess([]);
    render(<ChatDrawer open={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByTestId("chat-drawer-empty")).toBeInTheDocument();
    });
    expect(screen.getByText("No conversations yet.")).toBeInTheDocument();
  });

  it("shows error state when fetch fails", async () => {
    mockFetchError();
    render(<ChatDrawer open={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByTestId("chat-drawer-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Failed to load chats.")).toBeInTheDocument();
  });

  it("shows error state when fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<ChatDrawer open={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByTestId("chat-drawer-error")).toBeInTheDocument();
    });
  });

  it("links conversations to chat page", async () => {
    mockFetchSuccess();
    render(<ChatDrawer open={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    const link = screen.getByRole("link", { name: /Bob/ });
    expect(link).toHaveAttribute("href", "/chat/conv-1");
  });

  it("calls onClose when a conversation is clicked", async () => {
    mockFetchSuccess();
    const user = userEvent.setup();
    render(<ChatDrawer open={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Bob"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows online indicator for online users", async () => {
    mockIsOnline.mockReturnValue(true);
    mockFetchSuccess();
    render(<ChatDrawer open={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    const indicator = screen.getByTestId("drawer-presence-user-2");
    expect(indicator.className).toContain("bg-green-500");
  });

  it("shows offline indicator for offline users", async () => {
    mockIsOnline.mockReturnValue(false);
    mockFetchSuccess();
    render(<ChatDrawer open={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    const indicator = screen.getByTestId("drawer-presence-user-2");
    expect(indicator.className).toContain("bg-zinc-300");
    expect(indicator.className).not.toContain("bg-green-500");
  });

  it("shows initials when no avatar", async () => {
    mockFetchSuccess();
    render(<ChatDrawer open={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("B")).toBeInTheDocument();
    });
  });

  it("shows avatar image when provided", async () => {
    const withAvatar = {
      ...baseConversation,
      other: {
        ...baseConversation.other,
        avatarUrl: "https://example.com/avatar.jpg",
      },
    };
    mockFetchSuccess([withAvatar]);
    render(<ChatDrawer open={true} onClose={onClose} />);

    await waitFor(() => {
      const img = screen.getByRole("presentation");
      expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
    });
  });

  it("shows Unknown for null name", async () => {
    const noName = {
      ...baseConversation,
      other: { ...baseConversation.other, name: null },
    };
    mockFetchSuccess([noName]);
    render(<ChatDrawer open={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Unknown")).toBeInTheDocument();
    });
  });

  it("shows 'No messages yet' for conversations without messages", async () => {
    const noMessages = {
      ...baseConversation,
      lastMessage: null,
    };
    mockFetchSuccess([noMessages]);
    render(<ChatDrawer open={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("No messages yet")).toBeInTheDocument();
    });
  });

  it("renders multiple conversations", async () => {
    const conversations = [
      baseConversation,
      {
        ...baseConversation,
        id: "conv-2",
        other: { id: "user-3", name: "Charlie", avatarUrl: null },
        lastMessage: {
          content: "Hey there!",
          createdAt: new Date().toISOString(),
          senderId: "user-3",
        },
      },
    ];
    mockFetchSuccess(conversations);
    render(<ChatDrawer open={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("Charlie")).toBeInTheDocument();
    });
  });

  it("has 'Open full chat' link", async () => {
    mockFetchSuccess();
    render(<ChatDrawer open={true} onClose={onClose} />);

    const link = screen.getByText("Open full chat");
    expect(link).toHaveAttribute("href", "/chat");
  });

  it("refetches conversations when reopened", async () => {
    mockFetchSuccess();
    const { rerender } = render(
      <ChatDrawer open={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Close then reopen
    rerender(<ChatDrawer open={false} onClose={onClose} />);
    rerender(<ChatDrawer open={true} onClose={onClose} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it("has dialog role and accessible label", () => {
    mockFetchSuccess();
    render(<ChatDrawer open={true} onClose={onClose} />);

    const drawer = screen.getByRole("dialog");
    expect(drawer).toHaveAttribute("aria-label", "Chat list");
  });
});
