// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NoteForm from "../NoteForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock the LexicalEditor since it has complex DOM requirements
let mockEditorContent = "";
vi.mock("@/components/LexicalEditor", () => ({
  default: ({
    onChange,
    initialContent,
  }: {
    onChange: (html: string) => void;
    initialContent?: string;
  }) => {
    // Store onChange so tests can trigger it
    mockEditorContent = initialContent || "";
    return (
      <div data-testid="lexical-editor">
        <textarea
          aria-label="Note content"
          defaultValue={initialContent || ""}
          onChange={(e) => {
            mockEditorContent = e.target.value;
            onChange(e.target.value);
          }}
        />
      </div>
    );
  },
}));

const mockOnClose = vi.fn();

describe("NoteForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditorContent = "";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "note-1" }),
      })
    );
  });

  it("renders 'New Note' heading when creating", () => {
    render(<NoteForm projectId="proj-1" onClose={mockOnClose} />);

    expect(
      screen.getByRole("heading", { name: "New Note" })
    ).toBeInTheDocument();
  });

  it("renders 'Edit Note' heading when editing", () => {
    render(
      <NoteForm
        projectId="proj-1"
        note={{
          id: "note-1",
          title: "Test",
          content: "<p>Test content</p>",
          reminderAt: null,
        }}
        onClose={mockOnClose}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Edit Note" })
    ).toBeInTheDocument();
  });

  it("renders title, content editor, and reminder date fields", () => {
    render(<NoteForm projectId="proj-1" onClose={mockOnClose} />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByTestId("lexical-editor")).toBeInTheDocument();
    expect(screen.getByLabelText(/reminder date/i)).toBeInTheDocument();
  });

  it("shows validation error when content is empty", async () => {
    const user = userEvent.setup();
    render(<NoteForm projectId="proj-1" onClose={mockOnClose} />);

    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(screen.getByText("Note content is required")).toBeInTheDocument();
    });
    // Only the projects fetch should have been called (from useEffect), not a notes API call
    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/notes"),
      expect.anything()
    );
  });

  it("submits POST request when creating a new note", async () => {
    const user = userEvent.setup();
    render(<NoteForm projectId="proj-1" onClose={mockOnClose} />);

    await user.type(screen.getByLabelText(/title/i), "My Note");

    const editorTextarea = screen.getByLabelText(/note content/i);
    await user.type(editorTextarea, "<p>Some content</p>");

    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/hub/projects/proj-1/notes",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("submits PATCH request when editing a note", async () => {
    const user = userEvent.setup();
    render(
      <NoteForm
        projectId="proj-1"
        note={{
          id: "note-1",
          title: "Old Title",
          content: "<p>Old content</p>",
          reminderAt: null,
        }}
        onClose={mockOnClose}
      />
    );

    await user.clear(screen.getByLabelText(/title/i));
    await user.type(screen.getByLabelText(/title/i), "Updated Title");

    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/hub/notes/note-1",
        expect.objectContaining({
          method: "PATCH",
        })
      );
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows 'Saving...' while submitting", async () => {
    const user = userEvent.setup();
    // Make fetch hang to test loading state
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise(() => {}))
    );

    render(<NoteForm projectId="proj-1" onClose={mockOnClose} />);

    const editorTextarea = screen.getByLabelText(/note content/i);
    await user.type(editorTextarea, "Some content");

    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });
  });

  it("displays server error message on failed save", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Server error" }),
      })
    );

    render(<NoteForm projectId="proj-1" onClose={mockOnClose} />);

    const editorTextarea = screen.getByLabelText(/note content/i);
    await user.type(editorTextarea, "Some content");

    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("pre-fills fields when editing an existing note", () => {
    render(
      <NoteForm
        projectId="proj-1"
        note={{
          id: "note-1",
          title: "Existing Title",
          content: "<p>Existing content</p>",
          reminderAt: "2024-06-15T00:00:00.000Z",
        }}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByLabelText(/title/i)).toHaveValue("Existing Title");
    expect(screen.getByLabelText(/reminder date/i)).toHaveValue("2024-06-15");
  });
});
