// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import NewProjectPageClient from "../NewProjectPageClient";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

const mockCategories = [
  { id: "cat-1", name: "Content Creation Ideas" },
  { id: "cat-2", name: "Session Ideas" },
  { id: "cat-3", name: "General" },
];

describe("NewProjectPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "proj-1" }),
      })
    );
  });

  it("renders back link to /hub", () => {
    render(
      <NewProjectPageClient
        categories={mockCategories}
        defaultCategoryId={null}
      />
    );

    const backLink = screen.getByRole("link", { name: /back to hub/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/hub");
  });

  it("renders 'New Project' heading", () => {
    render(
      <NewProjectPageClient
        categories={mockCategories}
        defaultCategoryId={null}
      />
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "New Project" })
    ).toBeInTheDocument();
  });

  it("renders the project form with name and description fields", () => {
    render(
      <NewProjectPageClient
        categories={mockCategories}
        defaultCategoryId={null}
      />
    );

    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it("renders category selector when categories are provided", () => {
    render(
      <NewProjectPageClient
        categories={mockCategories}
        defaultCategoryId={null}
      />
    );

    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByText("Content Creation Ideas")).toBeInTheDocument();
    expect(screen.getByText("Session Ideas")).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
  });

  it("pre-selects category when defaultCategoryId is provided", () => {
    render(
      <NewProjectPageClient
        categories={mockCategories}
        defaultCategoryId="cat-2"
      />
    );

    const select = screen.getByLabelText(/category/i) as HTMLSelectElement;
    expect(select.value).toBe("cat-2");
  });
});
