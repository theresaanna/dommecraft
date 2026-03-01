// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findMany: vi.fn() },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

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

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SubTasksPage from "../page";

const mockFindMany = vi.mocked(prisma.task.findMany);

const dommeSession = {
  user: {
    id: "user-1",
    name: "Domme",
    email: "domme@test.com",
    role: "DOMME",
  },
};

const params = Promise.resolve({ id: "sub-1" });

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "task-1",
    title: "Test Task",
    description: null,
    priority: "MEDIUM",
    status: "NOT_STARTED",
    deadline: null,
    completedAt: null,
    recurrenceRule: null,
    recurrenceEndDate: null,
    reminderOffset: null,
    tags: [],
    userId: "user-1",
    subId: "sub-1",
    projectId: null,
    sourceNoteId: null,
    project: null,
    _count: { subtasks: 0, proofs: 0 },
    subtasks: [],
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

describe("SubTasksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(dommeSession);
    mockFindMany.mockResolvedValue([]);
  });

  it("redirects SUB users to /dashboard", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "sub-1", name: "Sub", email: "sub@test.com", role: "SUB" },
    });

    await expect(SubTasksPage({ params })).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("renders empty state when no tasks", async () => {
    const page = await SubTasksPage({ params });
    render(page);

    expect(screen.getByText("No tasks assigned yet.")).toBeInTheDocument();
  });

  it("renders open tasks before closed tasks", async () => {
    mockFindMany.mockResolvedValue([
      makeTask({ id: "t-closed", title: "Closed Task", status: "COMPLETED" }),
      makeTask({
        id: "t-open",
        title: "Open Task",
        status: "IN_PROGRESS",
      }),
    ] as never);

    const page = await SubTasksPage({ params });
    render(page);

    const openHeading = screen.getByText("Open");
    const closedHeading = screen.getByText("Closed");

    // Open section should appear before Closed section in the DOM
    expect(
      openHeading.compareDocumentPosition(closedHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("displays task title, priority badge, and status badge", async () => {
    mockFindMany.mockResolvedValue([
      makeTask({ title: "My Task", priority: "HIGH", status: "IN_PROGRESS" }),
    ] as never);

    const page = await SubTasksPage({ params });
    render(page);

    expect(screen.getByText("My Task")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("shows deadline with overdue styling for overdue open tasks", async () => {
    const pastDate = new Date("2020-01-15");
    mockFindMany.mockResolvedValue([
      makeTask({
        title: "Overdue Task",
        status: "NOT_STARTED",
        deadline: pastDate,
      }),
    ] as never);

    const page = await SubTasksPage({ params });
    render(page);

    const overdueElements = screen.getAllByText(/overdue/i);
    expect(overdueElements.length).toBeGreaterThanOrEqual(1);
  });

  it("does not show overdue for completed tasks with past deadline", async () => {
    const pastDate = new Date("2020-01-15");
    mockFindMany.mockResolvedValue([
      makeTask({
        title: "Done Task",
        status: "COMPLETED",
        deadline: pastDate,
      }),
    ] as never);

    const page = await SubTasksPage({ params });
    render(page);

    expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();
  });

  it("shows subtask progress", async () => {
    mockFindMany.mockResolvedValue([
      makeTask({
        _count: { subtasks: 3, proofs: 0 },
        subtasks: [
          { isCompleted: true },
          { isCompleted: false },
          { isCompleted: false },
        ],
      }),
    ] as never);

    const page = await SubTasksPage({ params });
    render(page);

    expect(screen.getByText("1/3 subtasks")).toBeInTheDocument();
  });

  it("links task titles to /tasks/{id}", async () => {
    mockFindMany.mockResolvedValue([
      makeTask({ id: "task-123", title: "Linked Task" }),
    ] as never);

    const page = await SubTasksPage({ params });
    render(page);

    const link = screen.getByRole("link", { name: "Linked Task" });
    expect(link).toHaveAttribute("href", "/tasks/task-123");
  });

  it("shows proof count when proofs exist", async () => {
    mockFindMany.mockResolvedValue([
      makeTask({ _count: { subtasks: 0, proofs: 2 } }),
    ] as never);

    const page = await SubTasksPage({ params });
    render(page);

    expect(screen.getByText("2 proofs")).toBeInTheDocument();
  });

  it("groups SUBMITTED tasks as open", async () => {
    mockFindMany.mockResolvedValue([
      makeTask({ title: "Submitted Task", status: "SUBMITTED" }),
    ] as never);

    const page = await SubTasksPage({ params });
    render(page);

    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.queryByText("Closed")).not.toBeInTheDocument();
  });
});
