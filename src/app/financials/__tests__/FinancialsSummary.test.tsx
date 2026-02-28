// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FinancialsSummary from "../FinancialsSummary";

const emptySummary = {
  total: "0",
  average: "0",
  count: 0,
  perSub: [],
  byCategory: [],
};

const populatedSummary = {
  total: "1500.00",
  average: "300.00",
  count: 5,
  perSub: [
    { subId: "sub-1", subName: "Top Sub", total: "1000.00", count: 3 },
    { subId: null, subName: "Unlinked", total: "500.00", count: 2 },
  ],
  byCategory: [
    { category: "Tribute", total: "900.00", count: 3 },
    { category: "Gift", total: "600.00", count: 2 },
  ],
};

describe("FinancialsSummary", () => {
  it("renders total earnings formatted as currency", () => {
    render(<FinancialsSummary summary={populatedSummary} />);

    expect(screen.getByText("$1,500.00")).toBeInTheDocument();
    expect(screen.getByText("Total Earnings")).toBeInTheDocument();
  });

  it("renders average per entry", () => {
    render(<FinancialsSummary summary={populatedSummary} />);

    expect(screen.getByText("$300.00")).toBeInTheDocument();
    expect(screen.getByText("Average per Entry")).toBeInTheDocument();
  });

  it("renders entry count", () => {
    render(<FinancialsSummary summary={populatedSummary} />);

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Entry Count")).toBeInTheDocument();
  });

  it("renders per-sub breakdown", () => {
    render(<FinancialsSummary summary={populatedSummary} />);

    expect(screen.getByText("Top Earners")).toBeInTheDocument();
    expect(screen.getByText("Top Sub")).toBeInTheDocument();
    expect(screen.getByText("Unlinked")).toBeInTheDocument();
  });

  it("renders category breakdown", () => {
    render(<FinancialsSummary summary={populatedSummary} />);

    expect(screen.getByText("By Category")).toBeInTheDocument();
    expect(screen.getByText(/Tribute/)).toBeInTheDocument();
    expect(screen.getByText(/Gift/)).toBeInTheDocument();
  });

  it("renders no data message when count is zero", () => {
    render(<FinancialsSummary summary={emptySummary} />);

    expect(
      screen.getByText("No financial data to display.")
    ).toBeInTheDocument();
  });

  it("does not render per-sub section when empty", () => {
    render(<FinancialsSummary summary={emptySummary} />);

    expect(screen.queryByText("Top Earners")).not.toBeInTheDocument();
  });

  it("does not render category section when empty", () => {
    render(<FinancialsSummary summary={emptySummary} />);

    expect(screen.queryByText("By Category")).not.toBeInTheDocument();
  });

  it("renders $0.00 for zero totals", () => {
    render(<FinancialsSummary summary={emptySummary} />);

    expect(screen.getAllByText("$0.00")).toHaveLength(2); // total + average
  });
});
