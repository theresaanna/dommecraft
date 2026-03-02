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

import { useSession } from "next-auth/react";

const mockUseSession = vi.mocked(useSession);

describe("ChatDrawerToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
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
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "user-1", name: "Test", role: "DOMME" as const, theme: "SYSTEM" as const, showOnlineStatus: true },
        expires: "2099-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<ChatDrawerToggle />);

    expect(screen.getByTestId("chat-drawer-toggle")).toBeInTheDocument();
  });

  it("has accessible label on toggle button", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "user-1", name: "Test", role: "DOMME" as const, theme: "SYSTEM" as const, showOnlineStatus: true },
        expires: "2099-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<ChatDrawerToggle />);

    expect(screen.getByLabelText("Open chat list")).toBeInTheDocument();
  });

  it("opens drawer when toggle button is clicked", async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "user-1", name: "Test", role: "DOMME" as const, theme: "SYSTEM" as const, showOnlineStatus: true },
        expires: "2099-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

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
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "user-1", name: "Test", role: "DOMME" as const, theme: "SYSTEM" as const, showOnlineStatus: true },
        expires: "2099-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

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
});
