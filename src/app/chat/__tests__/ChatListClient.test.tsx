// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
