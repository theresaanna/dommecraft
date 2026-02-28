// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SubsFilters from "../SubsFilters";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/subs",
}));

const defaultParams = {
  q: "",
  sub_type: [],
  arrangement_type: [],
  tags: [],
  financial_min: "",
  financial_max: "",
  sort: "createdAt",
  order: "desc",
};

describe("SubsFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders search input with current query", () => {
    render(
      <SubsFilters
        currentParams={{ ...defaultParams, q: "hello" }}
        availableTags={[]}
      />
    );

    const input = screen.getByPlaceholderText("Search subs...");
    expect(input).toHaveValue("hello");
  });

  it("renders sort dropdown with current sort value", () => {
    render(
      <SubsFilters currentParams={defaultParams} availableTags={[]} />
    );

    const select = screen.getByLabelText("Sort by");
    expect(select).toHaveValue("createdAt");
  });

  it("renders all sort options", () => {
    render(
      <SubsFilters currentParams={defaultParams} availableTags={[]} />
    );

    const select = screen.getByLabelText("Sort by");
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent("Date Added");
    expect(options[1]).toHaveTextContent("Last Updated");
    expect(options[2]).toHaveTextContent("Name");
    expect(options[3]).toHaveTextContent("Financial");
  });

  it("toggles sort order when clicking order button", async () => {
    const user = userEvent.setup();
    render(
      <SubsFilters currentParams={defaultParams} availableTags={[]} />
    );

    const orderButton = screen.getByLabelText("Sort ascending");
    await user.click(orderButton);

    expect(mockPush).toHaveBeenCalledWith("/subs?order=asc");
  });

  it("shows descending arrow when order is desc", () => {
    render(
      <SubsFilters currentParams={defaultParams} availableTags={[]} />
    );

    expect(
      screen.getByLabelText("Sort ascending")
    ).toHaveTextContent("\u2193");
  });

  it("shows ascending arrow when order is asc", () => {
    render(
      <SubsFilters
        currentParams={{ ...defaultParams, order: "asc" }}
        availableTags={[]}
      />
    );

    expect(
      screen.getByLabelText("Sort descending")
    ).toHaveTextContent("\u2191");
  });

  it("shows Filters button", () => {
    render(
      <SubsFilters currentParams={defaultParams} availableTags={[]} />
    );

    expect(screen.getByLabelText("Toggle filters")).toBeInTheDocument();
  });

  it("does not show filter panel by default when no filters active", () => {
    render(
      <SubsFilters currentParams={defaultParams} availableTags={[]} />
    );

    expect(
      screen.queryByText("Type of Submissive")
    ).not.toBeInTheDocument();
  });

  it("shows filter panel when Filters button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <SubsFilters currentParams={defaultParams} availableTags={[]} />
    );

    await user.click(screen.getByLabelText("Toggle filters"));

    expect(screen.getByText("Type of Submissive")).toBeInTheDocument();
    expect(screen.getByText("Arrangement Type")).toBeInTheDocument();
    expect(
      screen.getByText("Financial Contribution Range")
    ).toBeInTheDocument();
  });

  it("shows filter panel by default when filters are active", () => {
    render(
      <SubsFilters
        currentParams={{ ...defaultParams, sub_type: ["Finsub"] }}
        availableTags={[]}
      />
    );

    expect(screen.getByText("Type of Submissive")).toBeInTheDocument();
  });

  it("renders all sub type options in filter panel", async () => {
    const user = userEvent.setup();
    render(
      <SubsFilters currentParams={defaultParams} availableTags={[]} />
    );

    await user.click(screen.getByLabelText("Toggle filters"));

    const expectedTypes = [
      "Finsub",
      "Femsub",
      "Service Sub",
      "Pain Sub",
      "Pet",
      "Slave",
      "Sissy",
      "Brat",
      "Switch",
    ];
    for (const type of expectedTypes) {
      expect(screen.getByText(type)).toBeInTheDocument();
    }
  });

  it("renders all arrangement type options in filter panel", async () => {
    const user = userEvent.setup();
    render(
      <SubsFilters currentParams={defaultParams} availableTags={[]} />
    );

    await user.click(screen.getByLabelText("Toggle filters"));

    const arrangementFieldset = screen.getByText("Arrangement Type").closest("fieldset")!;
    const buttons = arrangementFieldset.querySelectorAll("button");
    const labels = [...buttons].map((b) => b.textContent);
    expect(labels).toEqual(["Online", "IRL", "Hybrid", "Financial", "Service"]);
  });

  it("navigates with sub_type param when clicking a sub type filter", async () => {
    const user = userEvent.setup();
    render(
      <SubsFilters currentParams={defaultParams} availableTags={[]} />
    );

    await user.click(screen.getByLabelText("Toggle filters"));
    await user.click(screen.getByText("Finsub"));

    expect(mockPush).toHaveBeenCalledWith("/subs?sub_type=Finsub");
  });

  it("removes sub_type when clicking an active sub type filter", async () => {
    const user = userEvent.setup();
    render(
      <SubsFilters
        currentParams={{ ...defaultParams, sub_type: ["Finsub"] }}
        availableTags={[]}
      />
    );

    await user.click(screen.getByText("Finsub"));

    expect(mockPush).toHaveBeenCalledWith("/subs?");
  });

  it("navigates with arrangement_type param when clicking an arrangement filter", async () => {
    const user = userEvent.setup();
    render(
      <SubsFilters currentParams={defaultParams} availableTags={[]} />
    );

    await user.click(screen.getByLabelText("Toggle filters"));
    await user.click(screen.getByText("Online"));

    expect(mockPush).toHaveBeenCalledWith(
      "/subs?arrangement_type=Online"
    );
  });

  it("renders available tags in filter panel", async () => {
    const user = userEvent.setup();
    render(
      <SubsFilters
        currentParams={defaultParams}
        availableTags={["loyal", "obedient"]}
      />
    );

    await user.click(screen.getByLabelText("Toggle filters"));

    expect(screen.getByText("#loyal")).toBeInTheDocument();
    expect(screen.getByText("#obedient")).toBeInTheDocument();
  });

  it("does not render tags section when no tags available", async () => {
    const user = userEvent.setup();
    render(
      <SubsFilters currentParams={defaultParams} availableTags={[]} />
    );

    await user.click(screen.getByLabelText("Toggle filters"));

    expect(screen.queryByText("Tags")).not.toBeInTheDocument();
  });

  it("navigates with tags param when clicking a tag filter", async () => {
    const user = userEvent.setup();
    render(
      <SubsFilters
        currentParams={defaultParams}
        availableTags={["loyal"]}
      />
    );

    await user.click(screen.getByLabelText("Toggle filters"));
    await user.click(screen.getByText("#loyal"));

    expect(mockPush).toHaveBeenCalledWith("/subs?tags=loyal");
  });

  it("renders financial min/max inputs in filter panel", async () => {
    const user = userEvent.setup();
    render(
      <SubsFilters currentParams={defaultParams} availableTags={[]} />
    );

    await user.click(screen.getByLabelText("Toggle filters"));

    expect(
      screen.getByLabelText("Financial minimum")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Financial maximum")
    ).toBeInTheDocument();
  });

  it("navigates with financial_min on blur", async () => {
    const user = userEvent.setup();
    render(
      <SubsFilters currentParams={defaultParams} availableTags={[]} />
    );

    await user.click(screen.getByLabelText("Toggle filters"));
    const minInput = screen.getByLabelText("Financial minimum");
    await user.click(minInput);
    await user.type(minInput, "100");
    await user.tab();

    expect(mockPush).toHaveBeenCalledWith("/subs?financial_min=100");
  });

  it("navigates with financial_max on blur", async () => {
    const user = userEvent.setup();
    render(
      <SubsFilters currentParams={defaultParams} availableTags={[]} />
    );

    await user.click(screen.getByLabelText("Toggle filters"));
    const maxInput = screen.getByLabelText("Financial maximum");
    await user.click(maxInput);
    await user.type(maxInput, "500");
    await user.tab();

    expect(mockPush).toHaveBeenCalledWith("/subs?financial_max=500");
  });

  it("shows filter count badge when filters are active", () => {
    render(
      <SubsFilters
        currentParams={{
          ...defaultParams,
          sub_type: ["Finsub", "Brat"],
          arrangement_type: ["Online"],
        }}
        availableTags={[]}
      />
    );

    expect(screen.getByLabelText("Toggle filters")).toHaveTextContent(
      "Filters (3)"
    );
  });

  it("shows clear all filters button when filters are active", () => {
    render(
      <SubsFilters
        currentParams={{ ...defaultParams, sub_type: ["Finsub"] }}
        availableTags={[]}
      />
    );

    expect(screen.getByText("Clear all filters")).toBeInTheDocument();
  });

  it("does not show clear button when no filters active", async () => {
    const user = userEvent.setup();
    render(
      <SubsFilters currentParams={defaultParams} availableTags={[]} />
    );

    await user.click(screen.getByLabelText("Toggle filters"));

    expect(
      screen.queryByText("Clear all filters")
    ).not.toBeInTheDocument();
  });

  it("clears all filters but preserves search query when clicking clear", async () => {
    const user = userEvent.setup();
    render(
      <SubsFilters
        currentParams={{
          ...defaultParams,
          q: "test",
          sub_type: ["Finsub"],
          arrangement_type: ["Online"],
          tags: ["loyal"],
          financial_min: "100",
          financial_max: "500",
        }}
        availableTags={["loyal"]}
      />
    );

    await user.click(screen.getByText("Clear all filters"));

    expect(mockPush).toHaveBeenCalledWith("/subs?q=test");
  });

  it("changes sort field via dropdown", async () => {
    const user = userEvent.setup();
    render(
      <SubsFilters currentParams={defaultParams} availableTags={[]} />
    );

    const select = screen.getByLabelText("Sort by");
    await user.selectOptions(select, "fullName");

    expect(mockPush).toHaveBeenCalledWith("/subs?sort=fullName");
  });

  it("preserves existing params when changing sort", async () => {
    const user = userEvent.setup();
    render(
      <SubsFilters
        currentParams={{ ...defaultParams, q: "test", sub_type: ["Finsub"] }}
        availableTags={[]}
      />
    );

    const select = screen.getByLabelText("Sort by");
    await user.selectOptions(select, "fullName");

    expect(mockPush).toHaveBeenCalledWith(
      "/subs?q=test&sub_type=Finsub&sort=fullName"
    );
  });

  it("does not include default sort/order in URL params", async () => {
    const user = userEvent.setup();
    render(
      <SubsFilters
        currentParams={{ ...defaultParams, sort: "fullName" }}
        availableTags={[]}
      />
    );

    const select = screen.getByLabelText("Sort by");
    await user.selectOptions(select, "createdAt");

    // createdAt is default, so it shouldn't be in the URL
    expect(mockPush).toHaveBeenCalledWith("/subs?");
  });
});
