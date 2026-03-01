// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import NewTaskPageClient from "../NewTaskPageClient";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockSubs = [
  { id: "sub-1", fullName: "Test Sub" },
  { id: "sub-2", fullName: "Another Sub" },
];

const mockProjects = [
  { id: "proj-1", name: "Project A" },
];

describe("NewTaskPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "task-1" }),
      })
    );
  });

  it("renders back link to /tasks", () => {
    render(
      <NewTaskPageClient
        availableSubs={mockSubs}
        availableProjects={mockProjects}
      />
    );

    const backLink = screen.getByRole("link", { name: /all tasks/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/tasks");
  });

  it("renders 'New Task' heading", () => {
    render(
      <NewTaskPageClient
        availableSubs={mockSubs}
        availableProjects={mockProjects}
      />
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "New Task" })
    ).toBeInTheDocument();
  });

  it("renders the task form with required fields", () => {
    render(
      <NewTaskPageClient
        availableSubs={mockSubs}
        availableProjects={mockProjects}
      />
    );

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sub/i)).toBeInTheDocument();
  });
});
