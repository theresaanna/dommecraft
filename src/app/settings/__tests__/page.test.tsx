// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("../SettingsClient", () => ({
  default: (props: { initialSettings: Record<string, unknown> }) => (
    <div data-testid="settings-client">
      <span data-testid="settings-name">{String(props.initialSettings.name)}</span>
      <span data-testid="settings-email">{String(props.initialSettings.email)}</span>
      <span data-testid="settings-theme">{String(props.initialSettings.theme)}</span>
      <span data-testid="settings-view">
        {String(props.initialSettings.calendarDefaultView)}
      </span>
    </div>
  ),
}));

import SettingsPage from "../page";
import { prisma } from "@/lib/prisma";

const mockFindUnique = vi.mocked(prisma.user.findUnique);

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /login when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(SettingsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when user not found in DB", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
    });
    mockFindUnique.mockResolvedValue(null);

    await expect(SettingsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("renders SettingsClient with user data when authenticated", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
    });
    mockFindUnique.mockResolvedValue({
      name: "Jane Doe",
      email: "jane@test.com",
      avatarUrl: "https://blob.test/avatar.png",
      theme: "DARK",
      calendarDefaultView: "WEEK",
    } as never);

    const page = await SettingsPage();
    render(page);

    expect(screen.getByTestId("settings-client")).toBeInTheDocument();
    expect(screen.getByTestId("settings-name")).toHaveTextContent("Jane Doe");
    expect(screen.getByTestId("settings-email")).toHaveTextContent(
      "jane@test.com"
    );
    expect(screen.getByTestId("settings-theme")).toHaveTextContent("DARK");
    expect(screen.getByTestId("settings-view")).toHaveTextContent("WEEK");
  });

  it("passes empty strings for null name and email", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
    });
    mockFindUnique.mockResolvedValue({
      name: null,
      email: null,
      avatarUrl: null,
      theme: "SYSTEM",
      calendarDefaultView: "MONTH",
    } as never);

    const page = await SettingsPage();
    render(page);

    expect(screen.getByTestId("settings-name")).toHaveTextContent("");
    expect(screen.getByTestId("settings-email")).toHaveTextContent("");
  });
});
