// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock auth and prisma before importing the component
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subProfile: { findMany: vi.fn().mockResolvedValue([]) },
    financialEntry: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: null }, _count: 0 }),
      groupBy: vi.fn().mockResolvedValue([]),
      findMany: vi.fn().mockResolvedValue([]),
    },
    project: { findMany: vi.fn().mockResolvedValue([]) },
    task: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    calendarEvent: { findMany: vi.fn().mockResolvedValue([]) },
    notification: { count: vi.fn().mockResolvedValue(0) },
    note: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import DashboardPage from "../page";

describe("DashboardPage quick action links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@test.com", role: "DOMME" },
    });
  });

  it("links 'New Entry' to /financials/new", async () => {
    const page = await DashboardPage();
    render(page);

    const links = screen.getAllByRole("link", { name: /new entry/i });
    links.forEach((link) => {
      expect(link).toHaveAttribute("href", "/financials/new");
    });
  });

  it("links 'Create Task' to /tasks/new", async () => {
    const page = await DashboardPage();
    render(page);

    const link = screen.getByRole("link", { name: /create task/i });
    expect(link).toHaveAttribute("href", "/tasks/new");
  });

  it("links 'New Event' to /calendar/new", async () => {
    const page = await DashboardPage();
    render(page);

    const link = screen.getByRole("link", { name: /new event/i });
    expect(link).toHaveAttribute("href", "/calendar/new");
  });

  it("links 'Add Sub' to /subs/new", async () => {
    const page = await DashboardPage();
    render(page);

    const links = screen.getAllByRole("link", { name: /add sub/i });
    expect(links[0]).toHaveAttribute("href", "/subs/new");
  });
});

describe("DashboardPage SUB view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "sub-user-1", name: "Sub User", email: "sub@test.com", role: "SUB" },
    });
  });

  it("does not show quick action buttons for SUB users", async () => {
    const page = await DashboardPage();
    render(page);

    expect(screen.queryByRole("link", { name: /add sub/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /new entry/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /create task/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /new event/i })).not.toBeInTheDocument();
  });

  it("does not show My Subs section for SUB users", async () => {
    const page = await DashboardPage();
    render(page);

    expect(screen.queryByText("My Subs")).not.toBeInTheDocument();
  });

  it("does not show Financials section for SUB users", async () => {
    const page = await DashboardPage();
    render(page);

    expect(screen.queryByText("Financials")).not.toBeInTheDocument();
  });

  it("does not show Task Summary section for SUB users", async () => {
    const page = await DashboardPage();
    render(page);

    expect(screen.queryByText("Task Summary")).not.toBeInTheDocument();
  });

  it("does not show Calendar section for SUB users", async () => {
    const page = await DashboardPage();
    render(page);

    expect(screen.queryByText("Calendar")).not.toBeInTheDocument();
  });

  it("does not show Creation Hub section for SUB users", async () => {
    const page = await DashboardPage();
    render(page);

    expect(screen.queryByText("Creation Hub")).not.toBeInTheDocument();
  });

  it("shows My Tasks section for SUB users", async () => {
    const page = await DashboardPage();
    render(page);

    expect(screen.getByText("My Tasks")).toBeInTheDocument();
  });
});
