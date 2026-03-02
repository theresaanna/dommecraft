// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatListClient from "../ChatListClient";

// Mock next/link
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

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
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

describe("ChatListClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("shows empty state when no conversations", () => {
    render(<ChatListClient conversations={[]} />);

    expect(screen.getByText("No conversations yet.")).toBeInTheDocument();
  });

  it("renders conversation with participant name", () => {
    render(<ChatListClient conversations={[baseConversation]} />);

    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("renders last message preview", () => {
    render(<ChatListClient conversations={[baseConversation]} />);

    expect(screen.getByText("Hello!")).toBeInTheDocument();
  });

  it("links to conversation page", () => {
    render(<ChatListClient conversations={[baseConversation]} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/chat/conv-1");
  });

  it("shows initials when no avatar", () => {
    render(<ChatListClient conversations={[baseConversation]} />);

    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("shows avatar image when provided", () => {
    const withAvatar = {
      ...baseConversation,
      other: {
        ...baseConversation.other,
        avatarUrl: "https://example.com/avatar.jpg",
      },
    };
    render(<ChatListClient conversations={[withAvatar]} />);

    const img = screen.getByRole("presentation");
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });

  it("shows Unknown for null name", () => {
    const noName = {
      ...baseConversation,
      other: { ...baseConversation.other, name: null },
    };
    render(<ChatListClient conversations={[noName]} />);

    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("renders multiple conversations", () => {
    const conversations = [
      baseConversation,
      {
        ...baseConversation,
        id: "conv-2",
        other: { id: "user-3", name: "Charlie", avatarUrl: null },
      },
    ];
    render(<ChatListClient conversations={conversations} />);

    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("shows New Chat button", () => {
    render(<ChatListClient conversations={[]} />);

    expect(screen.getByText("New Chat")).toBeInTheDocument();
  });

  it("fetches and displays contacts when New Chat is clicked", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { id: "user-3", name: "Alice", avatarUrl: null },
          { id: "user-4", name: "Charlie", avatarUrl: "/charlie.jpg" },
        ]),
    });
    global.fetch = mockFetch;

    render(<ChatListClient conversations={[]} />);

    await user.click(screen.getByText("New Chat"));

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Charlie")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/chat/contacts");
  });

  it("filters out contacts who already have conversations", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { id: "user-2", name: "Bob", avatarUrl: null }, // already in conversations
          { id: "user-3", name: "Alice", avatarUrl: null },
        ]),
    });
    global.fetch = mockFetch;

    render(<ChatListClient conversations={[baseConversation]} />);

    await user.click(screen.getByText("New Chat"));

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    // Bob should not appear in the contacts list (already has a conversation)
    const contactButtons = screen.getAllByRole("button");
    const contactNames = contactButtons.map((b) => b.textContent);
    expect(contactNames).not.toContain("Bob");
  });

  it("shows Cancel button when contacts are visible", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: "user-3", name: "Alice", avatarUrl: null }]),
    });

    render(<ChatListClient conversations={[]} />);

    await user.click(screen.getByText("New Chat"));

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  it("hides contacts when Cancel is clicked", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: "user-3", name: "Alice", avatarUrl: null }]),
    });

    render(<ChatListClient conversations={[]} />);

    await user.click(screen.getByText("New Chat"));

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Cancel"));

    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("shows no contacts message when all contacts have conversations", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { id: "user-2", name: "Bob", avatarUrl: null },
        ]),
    });

    render(<ChatListClient conversations={[baseConversation]} />);

    await user.click(screen.getByText("New Chat"));

    await waitFor(() => {
      expect(
        screen.getByText("No new contacts available.")
      ).toBeInTheDocument();
    });
  });

  it("starts a conversation when a contact is clicked", async () => {
    const user = userEvent.setup();
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([{ id: "user-3", name: "Alice", avatarUrl: null }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "conv-new" }),
      });
    global.fetch = mockFetch;

    render(<ChatListClient conversations={[]} />);

    await user.click(screen.getByText("New Chat"));

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Alice"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: "user-3" }),
      });
    });

    expect(mockPush).toHaveBeenCalledWith("/chat/conv-new");
  });
});
