// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProjectDetailClient from "../ProjectDetailClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
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

// Mock LexicalEditor used by NoteForm
vi.mock("@/components/LexicalEditor", () => ({
  default: ({ onChange }: { onChange: (html: string) => void }) => (
    <div data-testid="lexical-editor">
      <textarea
        aria-label="Note content"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

const mockProject = {
  id: "proj-1",
  name: "Test Project",
  description: "A test description",
  color: "#3b82f6",
  categoryId: "cat-1",
  category: { id: "cat-1", name: "Content Creation" },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-15T00:00:00.000Z",
};

const mockNotes = [
  {
    id: "note-1",
    title: "Test Note",
    content: "<p>Note content</p>",
    sortOrder: 0,
    reminderAt: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
];

const mockTasks = [
  {
    id: "task-1",
    title: "Test Task",
    completed: false,
    deadline: null,
    sortOrder: 0,
    calendarEventId: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
];

describe("ProjectDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    global.confirm = vi.fn();
  });

  it("renders project name and description", () => {
    render(
      <ProjectDetailClient
        project={mockProject}
        initialNotes={mockNotes}
        initialTasks={mockTasks}
      />
    );

    expect(screen.getByText("Test Project")).toBeInTheDocument();
    expect(screen.getByText("A test description")).toBeInTheDocument();
    expect(screen.getByText(/Content Creation/)).toBeInTheDocument();
  });

  it("renders Edit Project and Delete buttons", () => {
    render(
      <ProjectDetailClient
        project={mockProject}
        initialNotes={[]}
        initialTasks={[]}
      />
    );

    expect(
      screen.getByRole("button", { name: "Edit Project" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete" })
    ).toBeInTheDocument();
  });

  it("does not show edit form by default", () => {
    render(
      <ProjectDetailClient
        project={mockProject}
        initialNotes={[]}
        initialTasks={[]}
      />
    );

    expect(
      screen.queryByRole("heading", { name: "Edit Project" })
    ).not.toBeInTheDocument();
  });

  it("shows edit form when Edit Project button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ProjectDetailClient
        project={mockProject}
        initialNotes={[]}
        initialTasks={[]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Edit Project" }));

    expect(screen.getByText("Edit Project")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Project")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("A test description")
    ).toBeInTheDocument();
  });

  it("hides edit form when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ProjectDetailClient
        project={mockProject}
        initialNotes={[]}
        initialTasks={[]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Edit Project" }));
    expect(
      screen.getByRole("heading", { name: "Edit Project" })
    ).toBeInTheDocument();

    // The header button changes to "Cancel" when form is shown
    await user.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
    expect(
      screen.queryByRole("heading", { name: "Edit Project" })
    ).not.toBeInTheDocument();
  });

  it("submits edit form with PATCH method", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    global.fetch = mockFetch;

    render(
      <ProjectDetailClient
        project={mockProject}
        initialNotes={[]}
        initialTasks={[]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Edit Project" }));

    const nameInput = screen.getByDisplayValue("Test Project");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Project");

    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/hub/projects/proj-1",
        expect.objectContaining({
          method: "PATCH",
        })
      );
    });
  });

  it("shows color picker in edit form", async () => {
    const user = userEvent.setup();
    render(
      <ProjectDetailClient
        project={mockProject}
        initialNotes={[]}
        initialTasks={[]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Edit Project" }));

    expect(screen.getByTitle("Blue")).toBeInTheDocument();
    expect(screen.getByTitle("Red")).toBeInTheDocument();
    expect(screen.getByTitle("None")).toBeInTheDocument();
  });

  it("renders back link to hub", () => {
    render(
      <ProjectDetailClient
        project={mockProject}
        initialNotes={[]}
        initialTasks={[]}
      />
    );

    const backLink = screen.getByRole("link", { name: /back to hub/i });
    expect(backLink).toHaveAttribute("href", "/hub");
  });

  it("calls delete API when Delete is confirmed", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;
    vi.mocked(global.confirm).mockReturnValue(true);

    render(
      <ProjectDetailClient
        project={mockProject}
        initialNotes={[]}
        initialTasks={[]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(global.confirm).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith("/api/hub/projects/proj-1", {
      method: "DELETE",
    });
  });

  it("does not call delete API when confirm is cancelled", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn();
    global.fetch = mockFetch;
    vi.mocked(global.confirm).mockReturnValue(false);

    render(
      <ProjectDetailClient
        project={mockProject}
        initialNotes={[]}
        initialTasks={[]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(global.confirm).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("renders project without description", () => {
    render(
      <ProjectDetailClient
        project={{ ...mockProject, description: null }}
        initialNotes={[]}
        initialTasks={[]}
      />
    );

    expect(screen.getByText("Test Project")).toBeInTheDocument();
    expect(
      screen.queryByText("A test description")
    ).not.toBeInTheDocument();
  });
});
