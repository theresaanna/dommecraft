// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MyTaskDetailClient from "../MyTaskDetailClient";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
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

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "task-1",
    title: "Test Task",
    description: null,
    priority: "MEDIUM" as const,
    status: "NOT_STARTED" as const,
    deadline: null,
    tags: [],
    sub: { id: "sub-1", fullName: "Test Sub" },
    completedAt: null,
    declineReason: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    subtasks: [],
    proofs: [],
    ...overrides,
  };
}

describe("MyTaskDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );
  });

  // --- PENDING status: Accept/Decline UI ---

  it("shows accept and decline buttons for PENDING tasks", () => {
    render(<MyTaskDetailClient task={makeTask({ status: "PENDING" })} />);

    expect(screen.getByText("Pending Request")).toBeInTheDocument();
    expect(
      screen.getByText(/task request from your Domme/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Accept Task")).toBeInTheDocument();
    expect(screen.getByText("Decline")).toBeInTheDocument();
  });

  it("does not show submit button for PENDING tasks", () => {
    render(<MyTaskDetailClient task={makeTask({ status: "PENDING" })} />);

    expect(screen.queryByText("Submit as Done")).not.toBeInTheDocument();
  });

  it("calls accept API and redirects on accept", async () => {
    render(<MyTaskDetailClient task={makeTask({ status: "PENDING" })} />);

    fireEvent.click(screen.getByText("Accept Task"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/my-tasks/task-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "NOT_STARTED" }),
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/my-tasks");
    });
  });

  it("shows decline form when Decline is clicked", () => {
    render(<MyTaskDetailClient task={makeTask({ status: "PENDING" })} />);

    fireEvent.click(screen.getByText("Decline"));

    expect(screen.getByLabelText(/reason for declining/i)).toBeInTheDocument();
    expect(screen.getByText("Submit Decline")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("disables decline submit when reason is empty", () => {
    render(<MyTaskDetailClient task={makeTask({ status: "PENDING" })} />);

    fireEvent.click(screen.getByText("Decline"));

    const submitBtn = screen.getByText("Submit Decline");
    expect(submitBtn).toBeDisabled();
  });

  it("calls decline API with reason and redirects", async () => {
    render(<MyTaskDetailClient task={makeTask({ status: "PENDING" })} />);

    fireEvent.click(screen.getByText("Decline"));

    const textarea = screen.getByLabelText(/reason for declining/i);
    fireEvent.change(textarea, {
      target: { value: "Not enough time" },
    });

    fireEvent.click(screen.getByText("Submit Decline"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/my-tasks/task-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PENDING",
          declineReason: "Not enough time",
        }),
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/my-tasks");
    });
  });

  it("hides decline form when Cancel is clicked", () => {
    render(<MyTaskDetailClient task={makeTask({ status: "PENDING" })} />);

    fireEvent.click(screen.getByText("Decline"));
    expect(screen.getByLabelText(/reason for declining/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    expect(
      screen.queryByLabelText(/reason for declining/i)
    ).not.toBeInTheDocument();
  });

  // --- Proof submission redirect ---

  it("redirects to task list after submitting task as done", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));

    render(
      <MyTaskDetailClient task={makeTask({ status: "IN_PROGRESS" })} />
    );

    fireEvent.click(screen.getByText("Submit as Done"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/my-tasks");
    });
  });

  it("does not redirect when confirm is cancelled", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));

    render(
      <MyTaskDetailClient task={makeTask({ status: "IN_PROGRESS" })} />
    );

    fireEvent.click(screen.getByText("Submit as Done"));

    expect(mockPush).not.toHaveBeenCalled();
  });

  // --- Status displays ---

  it("shows submit button for NOT_STARTED tasks", () => {
    render(<MyTaskDetailClient task={makeTask({ status: "NOT_STARTED" })} />);

    expect(screen.getByText("Submit as Done")).toBeInTheDocument();
  });

  it("shows submit button for IN_PROGRESS tasks", () => {
    render(<MyTaskDetailClient task={makeTask({ status: "IN_PROGRESS" })} />);

    expect(screen.getByText("Submit as Done")).toBeInTheDocument();
  });

  it("shows awaiting review message for SUBMITTED tasks", () => {
    render(<MyTaskDetailClient task={makeTask({ status: "SUBMITTED" })} />);

    expect(
      screen.getByText(/awaiting review from your Domme/i)
    ).toBeInTheDocument();
    expect(screen.queryByText("Submit as Done")).not.toBeInTheDocument();
  });

  it("shows approved message for COMPLETED tasks", () => {
    render(
      <MyTaskDetailClient
        task={makeTask({
          status: "COMPLETED",
          completedAt: "2025-06-15T00:00:00.000Z",
        })}
      />
    );

    expect(screen.getByText(/task approved/i)).toBeInTheDocument();
  });

  // --- Error handling ---

  it("shows error when accept fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Server error" }),
      })
    );

    render(<MyTaskDetailClient task={makeTask({ status: "PENDING" })} />);

    fireEvent.click(screen.getByText("Accept Task"));

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  // --- Task details rendering ---

  it("renders task title and priority badge", () => {
    render(
      <MyTaskDetailClient
        task={makeTask({ title: "My Task", priority: "HIGH" })}
      />
    );

    expect(screen.getByText("My Task")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("renders description when present", () => {
    render(
      <MyTaskDetailClient
        task={makeTask({ description: "Do the thing" })}
      />
    );

    expect(screen.getByText("Do the thing")).toBeInTheDocument();
  });

  it("renders subtask progress", () => {
    render(
      <MyTaskDetailClient
        task={makeTask({
          subtasks: [
            { id: "s1", title: "Sub 1", isCompleted: true, sortOrder: 0 },
            { id: "s2", title: "Sub 2", isCompleted: false, sortOrder: 1 },
          ],
        })}
      />
    );

    expect(screen.getByText("1/2 completed")).toBeInTheDocument();
  });

  it("uses custom backHref for redirects", async () => {
    render(
      <MyTaskDetailClient
        task={makeTask({ status: "PENDING" })}
        backHref="/custom-back"
      />
    );

    fireEvent.click(screen.getByText("Accept Task"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/custom-back");
    });
  });
});
