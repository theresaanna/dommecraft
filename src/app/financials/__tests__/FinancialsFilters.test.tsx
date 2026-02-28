// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FinancialsFilters from "../FinancialsFilters";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/financials",
}));

const defaultParams = {
  time_range: "",
  date_from: "",
  date_to: "",
  sub_id: "",
  category: [] as string[],
  payment_method: [] as string[],
  is_in_app: "",
  sort: "date",
  order: "desc",
};

const availableSubs = [
  { id: "sub-1", fullName: "Test Sub" },
  { id: "sub-2", fullName: "Another Sub" },
];

describe("FinancialsFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sort controls", () => {
    render(
      <FinancialsFilters
        currentParams={defaultParams}
        availableSubs={availableSubs}
      />
    );

    expect(screen.getByLabelText("Sort by")).toBeInTheDocument();
    expect(screen.getByLabelText(/Sort ascending/)).toBeInTheDocument();
  });

  it("renders filter toggle button", () => {
    render(
      <FinancialsFilters
        currentParams={defaultParams}
        availableSubs={availableSubs}
      />
    );

    expect(screen.getByLabelText("Toggle filters")).toBeInTheDocument();
  });

  it("shows filter panel when toggle is clicked", async () => {
    const user = userEvent.setup();
    render(
      <FinancialsFilters
        currentParams={defaultParams}
        availableSubs={availableSubs}
      />
    );

    await user.click(screen.getByLabelText("Toggle filters"));

    expect(screen.getByText("Time Range")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Payment Method")).toBeInTheDocument();
    expect(screen.getByText("Source")).toBeInTheDocument();
  });

  it("navigates with time_range param when clicking preset", async () => {
    const user = userEvent.setup();
    render(
      <FinancialsFilters
        currentParams={defaultParams}
        availableSubs={availableSubs}
      />
    );

    await user.click(screen.getByLabelText("Toggle filters"));
    await user.click(screen.getByText("Week"));

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("time_range=week")
    );
  });

  it("navigates with category param when clicking category pill", async () => {
    const user = userEvent.setup();
    render(
      <FinancialsFilters
        currentParams={defaultParams}
        availableSubs={availableSubs}
      />
    );

    await user.click(screen.getByLabelText("Toggle filters"));
    await user.click(screen.getByText("Tribute"));

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("category=Tribute")
    );
  });

  it("removes category when clicking active category pill", async () => {
    const user = userEvent.setup();
    render(
      <FinancialsFilters
        currentParams={{ ...defaultParams, category: ["Tribute"] }}
        availableSubs={availableSubs}
      />
    );

    // Panel should be auto-open because a filter is active
    await user.click(screen.getByText("Tribute"));

    expect(mockPush).toHaveBeenCalledWith(
      expect.not.stringContaining("category=")
    );
  });

  it("navigates with payment_method param", async () => {
    const user = userEvent.setup();
    render(
      <FinancialsFilters
        currentParams={defaultParams}
        availableSubs={availableSubs}
      />
    );

    await user.click(screen.getByLabelText("Toggle filters"));
    await user.click(screen.getByText("CashApp"));

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("payment_method=CashApp")
    );
  });

  it("navigates with is_in_app param", async () => {
    const user = userEvent.setup();
    render(
      <FinancialsFilters
        currentParams={defaultParams}
        availableSubs={availableSubs}
      />
    );

    await user.click(screen.getByLabelText("Toggle filters"));
    await user.click(screen.getByText("In-app"));

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("is_in_app=true")
    );
  });

  it("shows filter count when filters are active", () => {
    render(
      <FinancialsFilters
        currentParams={{
          ...defaultParams,
          category: ["Tribute", "Gift"],
          sub_id: "sub-1",
        }}
        availableSubs={availableSubs}
      />
    );

    expect(screen.getByText("Filters (3)")).toBeInTheDocument();
  });

  it("shows Clear all filters button when filters are active", () => {
    render(
      <FinancialsFilters
        currentParams={{ ...defaultParams, category: ["Tribute"] }}
        availableSubs={availableSubs}
      />
    );

    expect(screen.getByText("Clear all filters")).toBeInTheDocument();
  });

  it("clears all filters when Clear button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <FinancialsFilters
        currentParams={{ ...defaultParams, category: ["Tribute"] }}
        availableSubs={availableSubs}
      />
    );

    await user.click(screen.getByText("Clear all filters"));

    expect(mockPush).toHaveBeenCalledWith("/financials?");
  });

  it("renders sub dropdown with available subs", async () => {
    const user = userEvent.setup();
    render(
      <FinancialsFilters
        currentParams={defaultParams}
        availableSubs={availableSubs}
      />
    );

    await user.click(screen.getByLabelText("Toggle filters"));

    const dropdown = screen.getByLabelText("Filter by sub");
    expect(dropdown).toBeInTheDocument();

    const options = dropdown.querySelectorAll("option");
    expect(options).toHaveLength(4); // All, Unlinked, Test Sub, Another Sub
  });

  it("changes sort field", async () => {
    const user = userEvent.setup();
    render(
      <FinancialsFilters
        currentParams={defaultParams}
        availableSubs={availableSubs}
      />
    );

    await user.selectOptions(screen.getByLabelText("Sort by"), "amount");

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("sort=amount")
    );
  });

  it("toggles sort order", async () => {
    const user = userEvent.setup();
    render(
      <FinancialsFilters
        currentParams={defaultParams}
        availableSubs={availableSubs}
      />
    );

    await user.click(screen.getByLabelText(/Sort ascending/));

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("order=asc")
    );
  });
});
