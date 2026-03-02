// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatDrawerToggle from "../ChatDrawerToggle";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

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

vi.mock("@/hooks/use-presence", () => ({
  usePresence: () => ({
    onlineUserIds: new Set<string>(),
    isOnline: vi.fn().mockReturnValue(false),
  }),
}));

const { mockClearUnreadChats, mockUseUnreadChats } = vi.hoisted(() => ({
  mockClearUnreadChats: vi.fn(),
  mockUseUnreadChats: vi.fn(),
}));

vi.mock("@/components/providers/notification-provider", () => ({
  useUnreadChats: (...args: unknown[]) => mockUseUnreadChats(...args),
}));

import { useSession } from "next-auth/react";

const mockUseSession = vi.mocked(useSession);

const authenticatedSession = {
  data: {
    user: {
      id: "user-1",
      name: "Test",
      role: "DOMME" as const,
      theme: "SYSTEM" as const,
      showOnlineStatus: true,
      notificationSound: true,
    },
    expires: "2099-01-01",
  },
  status: "authenticated" as const,
  update: vi.fn(),
};

describe("ChatDrawerToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockUseUnreadChats.mockReturnValue({
      unreadChatCount: 0,
      clearUnreadChats: mockClearUnreadChats,
    });
  });

  it("does not render when user is not authenticated", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(<ChatDrawerToggle />);

    expect(
      screen.queryByTestId("chat-drawer-toggle")
    ).not.toBeInTheDocument();
  });

  it("renders toggle button when user is authenticated", () => {
    mockUseSession.mockReturnValue(authenticatedSession);

    render(<ChatDrawerToggle />);

    expect(screen.getByTestId("chat-drawer-toggle")).toBeInTheDocument();
  });

  it("has accessible label on toggle button", () => {
    mockUseSession.mockReturnValue(authenticatedSession);

    render(<ChatDrawerToggle />);

    expect(screen.getByLabelText("Open chat list")).toBeInTheDocument();
  });

  it("opens drawer when toggle button is clicked", async () => {
    mockUseSession.mockReturnValue(authenticatedSession);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const user = userEvent.setup();
    render(<ChatDrawerToggle />);

    await user.click(screen.getByTestId("chat-drawer-toggle"));

    await waitFor(() => {
      const drawer = screen.getByTestId("chat-drawer");
      expect(drawer.className).toContain("translate-y-0");
    });
  });

  it("closes drawer when close button is clicked", async () => {
    mockUseSession.mockReturnValue(authenticatedSession);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const user = userEvent.setup();
    render(<ChatDrawerToggle />);

    await user.click(screen.getByTestId("chat-drawer-toggle"));

    await waitFor(() => {
      const drawer = screen.getByTestId("chat-drawer");
      expect(drawer.className).toContain("translate-y-0");
    });

    await user.click(screen.getByLabelText("Close chat drawer"));

    const drawer = screen.getByTestId("chat-drawer");
    expect(drawer.className).toContain("translate-y-full");
  });

  describe("unread chat badge", () => {
    it("does not show badge when there are no unread chats", () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockUseUnreadChats.mockReturnValue({
        unreadChatCount: 0,
        clearUnreadChats: mockClearUnreadChats,
      });

      render(<ChatDrawerToggle />);

      expect(
        screen.queryByTestId("unread-chat-badge")
      ).not.toBeInTheDocument();
    });

    it("shows badge with count when there are unread chats", () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockUseUnreadChats.mockReturnValue({
        unreadChatCount: 3,
        clearUnreadChats: mockClearUnreadChats,
      });

      render(<ChatDrawerToggle />);

      const badge = screen.getByTestId("unread-chat-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("3");
    });

    it("shows badge with single unread chat", () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockUseUnreadChats.mockReturnValue({
        unreadChatCount: 1,
        clearUnreadChats: mockClearUnreadChats,
      });

      render(<ChatDrawerToggle />);

      const badge = screen.getByTestId("unread-chat-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("1");
    });

    it("shows 9+ when count exceeds 9", () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockUseUnreadChats.mockReturnValue({
        unreadChatCount: 15,
        clearUnreadChats: mockClearUnreadChats,
      });

      render(<ChatDrawerToggle />);

      const badge = screen.getByTestId("unread-chat-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("9+");
    });

    it("does not show badge when user is not authenticated", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });
      mockUseUnreadChats.mockReturnValue({
        unreadChatCount: 5,
        clearUnreadChats: mockClearUnreadChats,
      });

      render(<ChatDrawerToggle />);

      expect(
        screen.queryByTestId("unread-chat-badge")
      ).not.toBeInTheDocument();
    });
  });
});
