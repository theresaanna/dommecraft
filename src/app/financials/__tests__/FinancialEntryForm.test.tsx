// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FinancialEntryForm from "../FinancialEntryForm";

const mockRefresh = vi.fn();
const mockOnClose = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const availableSubs = [
  { id: "sub-1", fullName: "Test Sub" },
  { id: "sub-2", fullName: "Another Sub" },
];

describe("FinancialEntryForm", () => {
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

  it("renders all form fields", () => {
    render(
      <FinancialEntryForm subs={availableSubs} onClose={mockOnClose} />
    );

    expect(screen.getByLabelText("Amount *")).toBeInTheDocument();
    expect(screen.getByLabelText("Currency")).toBeInTheDocument();
    expect(screen.getByLabelText("Category *")).toBeInTheDocument();
    expect(screen.getByLabelText("Payment Method")).toBeInTheDocument();
    expect(screen.getByLabelText("Sub")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(screen.getByLabelText("In-app transaction")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });

  it("shows New Entry title for new entries", () => {
    render(
      <FinancialEntryForm subs={availableSubs} onClose={mockOnClose} />
    );

    expect(screen.getByText("New Entry")).toBeInTheDocument();
    expect(screen.getByText("Add Entry")).toBeInTheDocument();
  });

  it("shows Edit Entry title when editing", () => {
    render(
      <FinancialEntryForm
        subs={availableSubs}
        entry={{
          id: "entry-1",
          amount: "100.00",
          currency: "USD",
          category: "Tribute",
          paymentMethod: "CashApp",
          notes: "Test note",
          date: "2024-06-01T00:00:00.000Z",
          isInApp: true,
          subId: "sub-1",
        }}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Edit Entry")).toBeInTheDocument();
    expect(screen.getByText("Update Entry")).toBeInTheDocument();
  });

  it("sub dropdown shows available subs", () => {
    render(
      <FinancialEntryForm subs={availableSubs} onClose={mockOnClose} />
    );

    const subSelect = screen.getByLabelText("Sub");
    const options = subSelect.querySelectorAll("option");
    expect(options).toHaveLength(3); // Unlinked + 2 subs
    expect(options[0].textContent).toBe("Unlinked");
    expect(options[1].textContent).toBe("Test Sub");
    expect(options[2].textContent).toBe("Another Sub");
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(
      <FinancialEntryForm subs={availableSubs} onClose={mockOnClose} />
    );

    await user.click(screen.getByText("Cancel"));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("submits POST request for new entry", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "entry-1" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(
      <FinancialEntryForm subs={availableSubs} onClose={mockOnClose} />
    );

    await user.type(screen.getByLabelText("Amount *"), "100");
    await user.selectOptions(screen.getByLabelText("Category *"), "Tribute");
    await user.click(screen.getByText("Add Entry"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/financials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"amount":100'),
      });
    });
  });

  it("submits PATCH request when editing", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "entry-1" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(
      <FinancialEntryForm
        subs={availableSubs}
        entry={{
          id: "entry-1",
          amount: "100.00",
          currency: "USD",
          category: "Tribute",
          paymentMethod: null,
          notes: null,
          date: "2024-06-01T00:00:00.000Z",
          isInApp: true,
          subId: null,
        }}
        onClose={mockOnClose}
      />
    );

    await user.click(screen.getByText("Update Entry"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/financials/entry-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  it("calls router.refresh and onClose after successful submission", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "entry-1" }),
      })
    );

    render(
      <FinancialEntryForm subs={availableSubs} onClose={mockOnClose} />
    );

    await user.type(screen.getByLabelText("Amount *"), "50");
    await user.selectOptions(screen.getByLabelText("Category *"), "Tip");
    await user.click(screen.getByText("Add Entry"));

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("shows error when API returns error", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Something went wrong" }),
      })
    );

    render(
      <FinancialEntryForm subs={availableSubs} onClose={mockOnClose} />
    );

    await user.type(screen.getByLabelText("Amount *"), "50");
    await user.selectOptions(screen.getByLabelText("Category *"), "Tip");
    await user.click(screen.getByText("Add Entry"));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  it("populates form with existing entry data in edit mode", () => {
    render(
      <FinancialEntryForm
        subs={availableSubs}
        entry={{
          id: "entry-1",
          amount: "250.50",
          currency: "EUR",
          category: "Gift",
          paymentMethod: "PayPal",
          notes: "Birthday gift",
          date: "2024-06-15T00:00:00.000Z",
          isInApp: false,
          subId: "sub-1",
        }}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByLabelText("Amount *")).toHaveValue(250.5);
    expect(screen.getByLabelText("Currency")).toHaveValue("EUR");
    expect(screen.getByLabelText("Category *")).toHaveValue("Gift");
    expect(screen.getByLabelText("Payment Method")).toHaveValue("PayPal");
    expect(screen.getByLabelText("Sub")).toHaveValue("sub-1");
    expect(screen.getByLabelText("Notes")).toHaveValue("Birthday gift");
  });
});
