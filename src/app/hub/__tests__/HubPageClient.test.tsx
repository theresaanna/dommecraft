// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HubPageClient from "../HubPageClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const mockCategories = [
  {
    id: "cat-1",
    name: "Content Creation Ideas",
    sortOrder: 0,
    projectCount: 2,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "cat-2",
    name: "Session Ideas",
    sortOrder: 1,
    projectCount: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

const mockProjects = [
  {
    id: "proj-1",
    name: "Test Project",
    description: "A test project",
    categoryId: "cat-1",
    category: { id: "cat-1", name: "Content Creation Ideas" },
    notesCount: 3,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-15T00:00:00.000Z",
  },
];

describe("HubPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Creation Hub heading", () => {
    render(
      <HubPageClient
        initialCategories={mockCategories}
        initialProjects={mockProjects}
      />
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Creation Hub" })
    ).toBeInTheDocument();
  });

  it("renders New Project as a link instead of a button", () => {
    render(
      <HubPageClient
        initialCategories={mockCategories}
        initialProjects={mockProjects}
      />
    );

    const link = screen.getByRole("link", { name: "New Project" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      "href",
      "/hub/projects/new?category=cat-1"
    );
  });

  it("includes selected category ID in the New Project link", () => {
    render(
      <HubPageClient
        initialCategories={mockCategories}
        initialProjects={mockProjects}
      />
    );

    const link = screen.getByRole("link", { name: "New Project" });
    expect(link.getAttribute("href")).toContain("category=cat-1");
  });

  it("does not render an inline ProjectForm", () => {
    render(
      <HubPageClient
        initialCategories={mockCategories}
        initialProjects={mockProjects}
      />
    );

    expect(screen.queryByText("Project Name *")).not.toBeInTheDocument();
  });

  it("renders Manage Categories link", () => {
    render(
      <HubPageClient
        initialCategories={mockCategories}
        initialProjects={mockProjects}
      />
    );

    const link = screen.getByRole("link", { name: "Manage Categories" });
    expect(link).toHaveAttribute("href", "/hub/categories");
  });

  it("renders projects filtered by selected category", () => {
    render(
      <HubPageClient
        initialCategories={mockCategories}
        initialProjects={mockProjects}
      />
    );

    expect(screen.getByText("Test Project")).toBeInTheDocument();
  });
});
