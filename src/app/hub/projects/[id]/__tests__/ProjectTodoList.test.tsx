// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProjectTodoList from "../ProjectTodoList";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const baseTasks = [
  {
    id: "task-1",
    title: "Buy supplies",
    completed: false,
    deadline: "2024-07-15T00:00:00.000Z",
    sortOrder: 0,
    calendarEventId: null,
    createdAt: "2024-07-01T00:00:00.000Z",
    updatedAt: "2024-07-01T00:00:00.000Z",
  },
  {
    id: "task-2",
    title: "Plan session",
    completed: true,
    deadline: null,
    sortOrder: 1,
    calendarEventId: null,
    createdAt: "2024-07-02T00:00:00.000Z",
    updatedAt: "2024-07-02T00:00:00.000Z",
  },
];

describe("ProjectTodoList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
  });

  it("renders empty state when no todos", () => {
    render(<ProjectTodoList tasks={[]} />);
    expect(screen.getByText("No todos yet. Add one above.")).toBeInTheDocument();
  });

  it("renders todo titles and deadlines", () => {
    render(<ProjectTodoList tasks={baseTasks} />);
    expect(screen.getByText("Buy supplies")).toBeInTheDocument();
    expect(screen.getByText("Plan session")).toBeInTheDocument();
    // Deadline should be formatted (exact date depends on timezone)
    expect(screen.getByText(/Jul \d+, 2024/)).toBeInTheDocument();
  });

  it("renders edit button for each todo", () => {
    render(<ProjectTodoList tasks={baseTasks} />);
    expect(screen.getByLabelText('Edit "Buy supplies"')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit "Plan session"')).toBeInTheDocument();
  });

  it("toggles completed via PATCH", async () => {
    const user = userEvent.setup();
    render(<ProjectTodoList tasks={baseTasks} />);
    const checkbox = screen.getByLabelText('Mark "Buy supplies" as complete');
    await user.click(checkbox);

    expect(fetch).toHaveBeenCalledWith("/api/hub/projects/tasks/task-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("deletes todo with confirmation", async () => {
    const user = userEvent.setup();
    render(<ProjectTodoList tasks={baseTasks} />);
    await user.click(screen.getByLabelText('Delete "Buy supplies"'));

    expect(confirm).toHaveBeenCalledWith('Delete todo "Buy supplies"?');
    expect(fetch).toHaveBeenCalledWith("/api/hub/projects/tasks/task-1", {
      method: "DELETE",
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("does not delete when confirm is cancelled", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    const user = userEvent.setup();
    render(<ProjectTodoList tasks={baseTasks} />);
    await user.click(screen.getByLabelText('Delete "Buy supplies"'));

    expect(confirm).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows inline edit form when edit button clicked", async () => {
    const user = userEvent.setup();
    render(<ProjectTodoList tasks={baseTasks} />);
    await user.click(screen.getByLabelText('Edit "Buy supplies"'));

    expect(screen.getByLabelText('Edit title for "Buy supplies"')).toBeInTheDocument();
    expect(screen.getByLabelText("Deadline")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("pre-fills edit form with current todo values", async () => {
    const user = userEvent.setup();
    render(<ProjectTodoList tasks={baseTasks} />);
    await user.click(screen.getByLabelText('Edit "Buy supplies"'));

    const titleInput = screen.getByLabelText('Edit title for "Buy supplies"') as HTMLInputElement;
    const deadlineInput = screen.getByLabelText("Deadline") as HTMLInputElement;
    expect(titleInput.value).toBe("Buy supplies");
    expect(deadlineInput.value).toBe("2024-07-15");
  });

  it("pre-fills empty deadline when todo has no deadline", async () => {
    const user = userEvent.setup();
    render(<ProjectTodoList tasks={baseTasks} />);
    await user.click(screen.getByLabelText('Edit "Plan session"'));

    const deadlineInput = screen.getByLabelText("Deadline") as HTMLInputElement;
    expect(deadlineInput.value).toBe("");
  });

  it("saves edited todo via PATCH with correct body", async () => {
    const user = userEvent.setup();
    render(<ProjectTodoList tasks={baseTasks} />);
    await user.click(screen.getByLabelText('Edit "Buy supplies"'));

    const titleInput = screen.getByLabelText('Edit title for "Buy supplies"');
    await user.clear(titleInput);
    await user.type(titleInput, "Updated title");
    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/hub/projects/tasks/task-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated title", deadline: "2024-07-15" }),
      });
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows error when title is empty on save", async () => {
    const user = userEvent.setup();
    render(<ProjectTodoList tasks={baseTasks} />);
    await user.click(screen.getByLabelText('Edit "Buy supplies"'));

    const titleInput = screen.getByLabelText('Edit title for "Buy supplies"');
    await user.clear(titleInput);
    await user.click(screen.getByText("Save"));

    expect(screen.getByText("Title is required")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("cancels editing without API call", async () => {
    const user = userEvent.setup();
    render(<ProjectTodoList tasks={baseTasks} />);
    await user.click(screen.getByLabelText('Edit "Buy supplies"'));

    expect(screen.getByLabelText('Edit title for "Buy supplies"')).toBeInTheDocument();
    await user.click(screen.getByText("Cancel"));

    expect(screen.queryByLabelText('Edit title for "Buy supplies"')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows error on failed PATCH", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Server error" }),
      })
    );
    const user = userEvent.setup();
    render(<ProjectTodoList tasks={baseTasks} />);
    await user.click(screen.getByLabelText('Edit "Buy supplies"'));
    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("clears deadline by saving with empty date", async () => {
    const user = userEvent.setup();
    render(<ProjectTodoList tasks={baseTasks} />);
    await user.click(screen.getByLabelText('Edit "Buy supplies"'));

    const deadlineInput = screen.getByLabelText("Deadline") as HTMLInputElement;
    await user.clear(deadlineInput);
    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/hub/projects/tasks/task-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Buy supplies", deadline: null }),
      });
    });
  });
});
