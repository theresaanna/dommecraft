// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FinancialsList from "../FinancialsList";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockEntries = [
  {
    id: "entry-1",
    amount: "100.00",
    currency: "USD",
    category: "Tribute",
    paymentMethod: "CashApp",
    notes: "Monthly tribute",
    date: "2024-06-01T00:00:00.000Z",
    isInApp: true,
    sub: { id: "sub-1", fullName: "Test Sub" },
  },
  {
    id: "entry-2",
    amount: "50.00",
    currency: "EUR",
    category: "Gift",
    paymentMethod: null,
    notes: null,
    date: "2024-06-15T00:00:00.000Z",
    isInApp: false,
    sub: null,
  },
];

describe("FinancialsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob()),
    }));
  });

  it("renders entries with amount, category, and date", () => {
    render(<FinancialsList entries={mockEntries} />);

    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("Tribute")).toBeInTheDocument();
    expect(screen.getByText("Test Sub")).toBeInTheDocument();
  });

  it("renders empty state when no entries", () => {
    render(<FinancialsList entries={[]} />);

    expect(
      screen.getByText("No financial entries yet. Add your first entry to get started.")
    ).toBeInTheDocument();
  });

  it("shows Unlinked for entries without sub", () => {
    render(<FinancialsList entries={mockEntries} />);

    expect(screen.getByText("Unlinked")).toBeInTheDocument();
  });

  it("shows In-app badge for in-app entries", () => {
    render(<FinancialsList entries={mockEntries} />);

    expect(screen.getByText("In-app")).toBeInTheDocument();
  });

  it("shows payment method when present", () => {
    render(<FinancialsList entries={mockEntries} />);

    expect(screen.getByText("CashApp")).toBeInTheDocument();
  });

  it("toggles checkbox selection", async () => {
    const user = userEvent.setup();
    render(<FinancialsList entries={mockEntries} />);

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);

    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(screen.getByText("Delete (1)")).toBeInTheDocument();
  });

  it("select all toggles all checkboxes", async () => {
    const user = userEvent.setup();
    render(<FinancialsList entries={mockEntries} />);

    await user.click(screen.getByText("Select All"));

    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(screen.getByText("Deselect All")).toBeInTheDocument();
  });

  it("export CSV button calls fetch with correct params", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob()),
    });
    vi.stubGlobal("fetch", mockFetch);

    // Mock URL.createObjectURL and related
    vi.stubGlobal("URL", {
      ...globalThis.URL,
      createObjectURL: vi.fn().mockReturnValue("blob:test"),
      revokeObjectURL: vi.fn(),
    });

    render(<FinancialsList entries={mockEntries} />);

    await user.click(screen.getByText("Export CSV"));

    expect(mockFetch).toHaveBeenCalledWith("/api/financials/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "csv" }),
    });
  });

  it("export PDF button calls fetch with correct params", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob()),
    });
    vi.stubGlobal("fetch", mockFetch);
    vi.stubGlobal("URL", {
      ...globalThis.URL,
      createObjectURL: vi.fn().mockReturnValue("blob:test"),
      revokeObjectURL: vi.fn(),
    });

    render(<FinancialsList entries={mockEntries} />);

    await user.click(screen.getByText("Export PDF"));

    expect(mockFetch).toHaveBeenCalledWith("/api/financials/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "pdf" }),
    });
  });

  it("delete button triggers confirm dialog", async () => {
    const user = userEvent.setup();
    const mockConfirm = vi.fn().mockReturnValue(false);
    vi.stubGlobal("confirm", mockConfirm);

    render(<FinancialsList entries={mockEntries} />);

    // Select an entry first
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);

    await user.click(screen.getByText("Delete (1)"));

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.stringContaining("Delete 1 entry")
    );
  });

  it("renders notes preview when notes exist", () => {
    render(<FinancialsList entries={mockEntries} />);

    expect(screen.getByText("Monthly tribute")).toBeInTheDocument();
  });
});
