// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Create a real DOM element for the editor root
let rootElement: HTMLDivElement;

const mockSelection = {
  isCollapsed: vi.fn().mockReturnValue(false),
  getTextContent: vi.fn().mockReturnValue("Buy groceries"),
};

vi.mock("lexical", async () => {
  const actual = await vi.importActual("lexical");
  return {
    ...actual,
    $getSelection: vi.fn(() => mockSelection),
    $isRangeSelection: vi.fn(() => true),
  };
});

const mockEditorState = {
  read: vi.fn((fn: () => void) => fn()),
};

const mockEditor = {
  getRootElement: vi.fn(() => rootElement),
  getEditorState: vi.fn(() => mockEditorState),
};

vi.mock("@lexical/react/LexicalComposerContext", () => ({
  useLexicalComposerContext: () => [mockEditor],
}));

import ContextMenuPlugin from "../ContextMenuPlugin";
import { $getSelection, $isRangeSelection } from "lexical";

const mockGetSelection = vi.mocked($getSelection);
const mockIsRangeSelection = vi.mocked($isRangeSelection);

const mockOnTaskCreated = vi.fn();

const multipleProjects = [
  { id: "proj-1", name: "Session Planning" },
  { id: "proj-2", name: "Content Ideas" },
  { id: "proj-3", name: "Gift List" },
];

function renderPlugin(props?: {
  projectId?: string;
  projects?: { id: string; name: string }[];
  onTaskCreated?: () => void;
}) {
  return render(
    <ContextMenuPlugin
      projectId={props?.projectId ?? "proj-1"}
      projects={props?.projects}
      onTaskCreated={props?.onTaskCreated ?? mockOnTaskCreated}
    />
  );
}

function dispatchContextMenu(x = 100, y = 100) {
  const event = new MouseEvent("contextmenu", {
    bubbles: true,
    clientX: x,
    clientY: y,
  });
  // Make preventDefault trackable
  const preventDefaultSpy = vi.fn();
  Object.defineProperty(event, "preventDefault", {
    value: preventDefaultSpy,
    writable: true,
  });
  rootElement.dispatchEvent(event);
  return preventDefaultSpy;
}

describe("ContextMenuPlugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rootElement = document.createElement("div");
    document.body.appendChild(rootElement);
    mockEditor.getRootElement.mockReturnValue(rootElement);
    mockSelection.isCollapsed.mockReturnValue(false);
    mockSelection.getTextContent.mockReturnValue("Buy groceries");
    mockGetSelection.mockReturnValue(mockSelection as never);
    mockIsRangeSelection.mockReturnValue(true);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "task-1", title: "Buy groceries" }),
      })
    );

    // Mock viewport dimensions
    Object.defineProperty(window, "innerWidth", { value: 1024, writable: true });
    Object.defineProperty(window, "innerHeight", { value: 768, writable: true });
  });

  afterEach(() => {
    document.body.removeChild(rootElement);
  });

  it("does not show menu when no text is selected", () => {
    mockIsRangeSelection.mockReturnValue(false);
    renderPlugin();

    act(() => {
      dispatchContextMenu();
    });

    expect(screen.queryByTestId("context-menu")).not.toBeInTheDocument();
  });

  it("does not show menu when selection is collapsed", () => {
    mockSelection.isCollapsed.mockReturnValue(true);
    renderPlugin();

    act(() => {
      dispatchContextMenu();
    });

    expect(screen.queryByTestId("context-menu")).not.toBeInTheDocument();
  });

  it("does not show menu when selected text is empty", () => {
    mockSelection.getTextContent.mockReturnValue("   ");
    renderPlugin();

    act(() => {
      dispatchContextMenu();
    });

    expect(screen.queryByTestId("context-menu")).not.toBeInTheDocument();
  });

  it("shows menu with 'Add as Task' when text is selected", () => {
    renderPlugin();

    act(() => {
      dispatchContextMenu();
    });

    expect(screen.getByTestId("context-menu")).toBeInTheDocument();
    expect(screen.getByTestId("add-task-button")).toHaveTextContent("Add as Task");
  });

  it("prevents default browser context menu when selection exists", () => {
    renderPlugin();

    let preventDefaultSpy: ReturnType<typeof vi.fn>;
    act(() => {
      preventDefaultSpy = dispatchContextMenu();
    });

    expect(preventDefaultSpy!).toHaveBeenCalled();
  });

  it("does not prevent default when no selection", () => {
    mockIsRangeSelection.mockReturnValue(false);
    renderPlugin();

    let preventDefaultSpy: ReturnType<typeof vi.fn>;
    act(() => {
      preventDefaultSpy = dispatchContextMenu();
    });

    expect(preventDefaultSpy!).not.toHaveBeenCalled();
  });

  it("creates task directly when single project (no projects array)", async () => {
    renderPlugin({ projectId: "proj-1" });

    act(() => {
      dispatchContextMenu();
    });

    await act(async () => {
      screen.getByTestId("add-task-button").click();
    });

    expect(fetch).toHaveBeenCalledWith("/api/hub/projects/proj-1/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Buy groceries" }),
    });
  });

  it("shows project submenu when multiple projects provided", async () => {
    const user = userEvent.setup();
    renderPlugin({ projects: multipleProjects });

    act(() => {
      dispatchContextMenu();
    });

    const addButton = screen.getByTestId("add-task-button");
    // The button should have a right arrow indicating submenu
    expect(addButton).toHaveTextContent("Add as Task");

    // Hover to show submenu
    await user.hover(addButton.parentElement!);

    await waitFor(() => {
      expect(screen.getByTestId("project-submenu")).toBeInTheDocument();
    });

    expect(screen.getByText("Session Planning")).toBeInTheDocument();
    expect(screen.getByText("Content Ideas")).toBeInTheDocument();
    expect(screen.getByText("Gift List")).toBeInTheDocument();
  });

  it("creates task for selected project in submenu", async () => {
    renderPlugin({ projects: multipleProjects });

    act(() => {
      dispatchContextMenu();
    });

    // Click button to toggle submenu open
    await act(async () => {
      screen.getByTestId("add-task-button").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("project-submenu")).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByText("Content Ideas").click();
    });

    expect(fetch).toHaveBeenCalledWith("/api/hub/projects/proj-2/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Buy groceries" }),
    });
  });

  it("shows success feedback after task creation", async () => {
    renderPlugin({ projectId: "proj-1" });

    act(() => {
      dispatchContextMenu();
    });

    await act(async () => {
      screen.getByTestId("add-task-button").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("context-menu-feedback")).toHaveTextContent(
        "Task added"
      );
    });
  });

  it("shows error feedback on API failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Server error" }),
      })
    );
    renderPlugin({ projectId: "proj-1" });

    act(() => {
      dispatchContextMenu();
    });

    await act(async () => {
      screen.getByTestId("add-task-button").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("context-menu-feedback")).toHaveTextContent(
        "Failed to add task"
      );
    });
  });

  it("calls onTaskCreated callback on success", async () => {
    renderPlugin({ projectId: "proj-1" });

    act(() => {
      dispatchContextMenu();
    });

    await act(async () => {
      screen.getByTestId("add-task-button").click();
    });

    await waitFor(() => {
      expect(mockOnTaskCreated).toHaveBeenCalled();
    });
  });

  it("closes on Escape key", () => {
    renderPlugin();

    act(() => {
      dispatchContextMenu();
    });

    expect(screen.getByTestId("context-menu")).toBeInTheDocument();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });

    expect(screen.queryByTestId("context-menu")).not.toBeInTheDocument();
  });

  it("closes on click outside", () => {
    renderPlugin();

    act(() => {
      dispatchContextMenu();
    });

    expect(screen.getByTestId("context-menu")).toBeInTheDocument();

    act(() => {
      document.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true })
      );
    });

    expect(screen.queryByTestId("context-menu")).not.toBeInTheDocument();
  });

  it("highlights current project in submenu", async () => {
    const user = userEvent.setup();
    renderPlugin({ projectId: "proj-1", projects: multipleProjects });

    act(() => {
      dispatchContextMenu();
    });

    await user.hover(screen.getByTestId("add-task-button").parentElement!);

    await waitFor(() => {
      expect(screen.getByTestId("project-submenu")).toBeInTheDocument();
    });

    // Current project should have font-medium class
    const currentProjectButton = screen.getByText("Session Planning");
    expect(currentProjectButton.className).toContain("font-medium");
  });
});
