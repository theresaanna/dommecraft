// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MyTasksPageClient from "../MyTasksPageClient";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "task-1",
    title: "Test Task",
    description: null,
    priority: "MEDIUM" as const,
    status: "NOT_STARTED" as const,
    declineReason: null,
    deadline: null,
    tags: [],
    sub: { id: "sub-1", fullName: "Test Sub" },
    subtaskCount: 0,
    proofCount: 0,
    completedSubtasks: 0,
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("MyTasksPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders unlinked state when hasLinkedProfile is false", () => {
    render(
      <MyTasksPageClient tasks={[]} hasLinkedProfile={false} />
    );

    expect(screen.getByText(/not linked/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /link account/i })).toBeInTheDocument();
  });

  it("shows Requests tab with pending tasks", () => {
    const tasks = [
      makeTask({ id: "t-1", title: "Pending Task", status: "PENDING" }),
    ];

    render(
      <MyTasksPageClient tasks={tasks} hasLinkedProfile={true} />
    );

    expect(screen.getByText("Requests")).toBeInTheDocument();
    expect(screen.getByText("Pending Task")).toBeInTheDocument();
    expect(screen.getByText("Pending Request")).toBeInTheDocument();
  });

  it("defaults to Requests tab when pending tasks exist", () => {
    const tasks = [
      makeTask({ id: "t-1", title: "Pending Task", status: "PENDING" }),
      makeTask({ id: "t-2", title: "Active Task", status: "NOT_STARTED" }),
    ];

    render(
      <MyTasksPageClient tasks={tasks} hasLinkedProfile={true} />
    );

    // Pending task should be visible (Requests tab is active by default)
    expect(screen.getByText("Pending Task")).toBeInTheDocument();
    // Active task should not be visible in the Requests tab
    expect(screen.queryByText("Active Task")).not.toBeInTheDocument();
  });

  it("defaults to Active tab when no pending tasks exist", () => {
    const tasks = [
      makeTask({ id: "t-1", title: "Active Task", status: "IN_PROGRESS" }),
    ];

    render(
      <MyTasksPageClient tasks={tasks} hasLinkedProfile={true} />
    );

    expect(screen.getByText("Active Task")).toBeInTheDocument();
  });

  it("filters tasks by tab", () => {
    const tasks = [
      makeTask({ id: "t-1", title: "Pending Task", status: "PENDING" }),
      makeTask({ id: "t-2", title: "Active Task", status: "NOT_STARTED" }),
      makeTask({ id: "t-3", title: "Submitted Task", status: "SUBMITTED" }),
      makeTask({ id: "t-4", title: "Completed Task", status: "COMPLETED" }),
    ];

    render(
      <MyTasksPageClient tasks={tasks} hasLinkedProfile={true} />
    );

    // Switch to Active tab
    fireEvent.click(screen.getByText("Active"));
    expect(screen.getByText("Active Task")).toBeInTheDocument();
    expect(screen.queryByText("Pending Task")).not.toBeInTheDocument();

    // Switch to Submitted tab
    fireEvent.click(screen.getByText("Submitted"));
    expect(screen.getByText("Submitted Task")).toBeInTheDocument();
    expect(screen.queryByText("Active Task")).not.toBeInTheDocument();

    // Switch to Completed tab
    fireEvent.click(screen.getByText("Completed"));
    expect(screen.getByText("Completed Task")).toBeInTheDocument();

    // Switch to All tab
    fireEvent.click(screen.getByText("All"));
    expect(screen.getByText("Pending Task")).toBeInTheDocument();
    expect(screen.getByText("Active Task")).toBeInTheDocument();
    expect(screen.getByText("Submitted Task")).toBeInTheDocument();
    expect(screen.getByText("Completed Task")).toBeInTheDocument();
  });

  it("shows tab counts", () => {
    const tasks = [
      makeTask({ id: "t-1", status: "PENDING" }),
      makeTask({ id: "t-2", status: "PENDING" }),
      makeTask({ id: "t-3", status: "NOT_STARTED" }),
    ];

    render(
      <MyTasksPageClient tasks={tasks} hasLinkedProfile={true} />
    );

    // The Requests tab should show count 2
    const requestsTab = screen.getByText("Requests").closest("button");
    expect(requestsTab?.textContent).toContain("2");
  });

  it("shows empty state for tabs with no tasks", () => {
    render(
      <MyTasksPageClient tasks={[]} hasLinkedProfile={true} />
    );

    // Switch to Active (default when no pending)
    expect(screen.getByText(/no tasks in this category/i)).toBeInTheDocument();
  });

  it("displays PENDING badge with correct style", () => {
    const tasks = [
      makeTask({ id: "t-1", title: "Pending Task", status: "PENDING" }),
    ];

    render(
      <MyTasksPageClient tasks={tasks} hasLinkedProfile={true} />
    );

    const badge = screen.getByText("Pending Request");
    expect(badge.className).toContain("violet");
  });

  it("links tasks to correct detail page", () => {
    const tasks = [
      makeTask({ id: "task-123", title: "Linked Task", status: "PENDING" }),
    ];

    render(
      <MyTasksPageClient tasks={tasks} hasLinkedProfile={true} />
    );

    const link = screen.getByRole("link", { name: /Linked Task/i });
    expect(link).toHaveAttribute("href", "/my-tasks/task-123");
  });
});
