// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagInput from "../TagInput";

describe("TagInput", () => {
  const user = userEvent.setup();
  const defaultProps = {
    label: "Tags",
    name: "tags",
    placeholder: "Add a tag...",
    suggestions: ["alpha", "beta", "gamma", "bondage", "roleplay"],
    value: [] as string[],
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the label", () => {
    render(<TagInput {...defaultProps} />);
    expect(screen.getByText("Tags")).toBeInTheDocument();
  });

  it("renders the placeholder when no tags are set", () => {
    render(<TagInput {...defaultProps} />);
    expect(screen.getByPlaceholderText("Add a tag...")).toBeInTheDocument();
  });

  it("does not show placeholder when tags exist", () => {
    render(<TagInput {...defaultProps} value={["alpha"]} />);
    expect(screen.queryByPlaceholderText("Add a tag...")).not.toBeInTheDocument();
  });

  it("renders existing tags as chips", () => {
    render(<TagInput {...defaultProps} value={["alpha", "beta"]} />);
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("beta")).toBeInTheDocument();
  });

  it("calls onChange when typing and pressing Enter", async () => {
    const onChange = vi.fn();
    render(<TagInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.type(input, "newtag{Enter}");

    expect(onChange).toHaveBeenCalledWith(["newtag"]);
  });

  it("calls onChange when typing and pressing comma", async () => {
    const onChange = vi.fn();
    render(<TagInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.type(input, "newtag,");

    expect(onChange).toHaveBeenCalledWith(["newtag"]);
  });

  it("removes a tag when the remove button is clicked", async () => {
    const onChange = vi.fn();
    render(
      <TagInput {...defaultProps} value={["alpha", "beta"]} onChange={onChange} />
    );

    const removeBtn = screen.getByLabelText("Remove alpha");
    await user.click(removeBtn);

    expect(onChange).toHaveBeenCalledWith(["beta"]);
  });

  it("removes the last tag on Backspace when input is empty", async () => {
    const onChange = vi.fn();
    render(
      <TagInput {...defaultProps} value={["alpha", "beta"]} onChange={onChange} />
    );

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.keyboard("{Backspace}");

    expect(onChange).toHaveBeenCalledWith(["alpha"]);
  });

  it("shows suggestions dropdown on focus", async () => {
    render(<TagInput {...defaultProps} />);

    const input = screen.getByRole("textbox");
    await user.click(input);

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("bondage")).toBeInTheDocument();
  });

  it("filters suggestions based on input", async () => {
    render(<TagInput {...defaultProps} />);

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.type(input, "al");

    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.queryByText("bondage")).not.toBeInTheDocument();
  });

  it("excludes already-selected values from suggestions", async () => {
    render(<TagInput {...defaultProps} value={["alpha"]} />);

    const input = screen.getByRole("textbox");
    await user.click(input);

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();
    // alpha should not be in the dropdown since it's already selected
    const options = screen.getAllByRole("option");
    const optionTexts = options.map((o: HTMLElement) => o.textContent);
    expect(optionTexts).not.toContain("alpha");
    expect(optionTexts).toContain("beta");
  });

  it("does not add duplicate tags", async () => {
    const onChange = vi.fn();
    render(
      <TagInput {...defaultProps} value={["alpha"]} onChange={onChange} />
    );

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.type(input, "alpha{Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not add empty/whitespace tags", async () => {
    const onChange = vi.fn();
    render(<TagInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.type(input, "   {Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("selects a suggestion with keyboard navigation", async () => {
    const onChange = vi.fn();
    render(<TagInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole("textbox");
    await user.click(input);
    // Arrow down to first suggestion, then Enter
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith(["alpha"]);
  });

  it("selects a suggestion by clicking it", async () => {
    const onChange = vi.fn();
    render(<TagInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole("textbox");
    await user.click(input);

    // Click the "beta" suggestion
    const betaOption = screen.getAllByRole("option").find(
      (el: HTMLElement) => el.textContent === "beta"
    );
    await user.click(betaOption!);

    expect(onChange).toHaveBeenCalledWith(["beta"]);
  });

  it("renders hidden inputs for form submission", () => {
    const { container } = render(
      <TagInput {...defaultProps} value={["alpha", "beta"]} />
    );

    const hiddenInputs = container.querySelectorAll(
      'input[type="hidden"][name="tags"]'
    );
    expect(hiddenInputs).toHaveLength(2);
    expect((hiddenInputs[0] as HTMLInputElement).value).toBe("alpha");
    expect((hiddenInputs[1] as HTMLInputElement).value).toBe("beta");
  });

  it("closes dropdown on Escape", async () => {
    render(<TagInput {...defaultProps} />);

    const input = screen.getByRole("textbox");
    await user.click(input);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
