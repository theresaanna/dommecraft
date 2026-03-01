// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import NewFinancialEntryPageClient from "../NewFinancialEntryPageClient";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockSubs = [
  { id: "sub-1", fullName: "Test Sub" },
  { id: "sub-2", fullName: "Another Sub" },
];

describe("NewFinancialEntryPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "entry-1" }),
      })
    );
  });

  it("renders back link to /financials", () => {
    render(<NewFinancialEntryPageClient availableSubs={mockSubs} />);

    const backLink = screen.getByRole("link", { name: /all financials/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/financials");
  });

  it("renders 'New Entry' heading", () => {
    render(<NewFinancialEntryPageClient availableSubs={mockSubs} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "New Entry" })
    ).toBeInTheDocument();
  });

  it("renders the financial entry form with required fields", () => {
    render(<NewFinancialEntryPageClient availableSubs={mockSubs} />);

    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
  });
});
