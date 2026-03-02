// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmojiPicker from "../EmojiPicker";

const STORAGE_KEY = "frequent-emoji";

describe("EmojiPicker", () => {
  const onSelect = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders the emoji picker with search and categories", () => {
    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />);

    expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search emoji...")).toBeInTheDocument();
    expect(screen.getByTestId("category-tabs")).toBeInTheDocument();
  });

  it("focuses the search input on mount", () => {
    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />);

    const searchInput = screen.getByPlaceholderText("Search emoji...");
    expect(document.activeElement).toBe(searchInput);
  });

  it("renders all emoji categories", () => {
    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />);

    expect(screen.getByTestId("category-smileys")).toBeInTheDocument();
    expect(screen.getByTestId("category-gestures")).toBeInTheDocument();
    expect(screen.getByTestId("category-animals")).toBeInTheDocument();
    expect(screen.getByTestId("category-food")).toBeInTheDocument();
    expect(screen.getByTestId("category-activities")).toBeInTheDocument();
    expect(screen.getByTestId("category-travel")).toBeInTheDocument();
    expect(screen.getByTestId("category-objects")).toBeInTheDocument();
    expect(screen.getByTestId("category-symbols")).toBeInTheDocument();
  });

  it("displays category headers", () => {
    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />);

    expect(screen.getByText("Smileys & People")).toBeInTheDocument();
    expect(screen.getByText("Animals & Nature")).toBeInTheDocument();
    expect(screen.getByText("Food & Drink")).toBeInTheDocument();
  });

  it("calls onSelect when an emoji is clicked", async () => {
    const user = userEvent.setup();
    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />);

    // Find the first emoji button in smileys category
    const smileysSection = screen.getByTestId("category-smileys");
    const firstEmoji = within(smileysSection).getAllByRole("option")[0];
    await user.click(firstEmoji);

    expect(onSelect).toHaveBeenCalledWith("😀");
  });

  it("records emoji usage to localStorage when selected", async () => {
    const user = userEvent.setup();
    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />);

    const smileysSection = screen.getByTestId("category-smileys");
    const firstEmoji = within(smileysSection).getAllByRole("option")[0];
    await user.click(firstEmoji);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0].emoji).toBe("😀");
  });

  it("shows frequently used section when there are frequent emoji", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { emoji: "🎉", count: 5, lastUsed: Date.now() },
        { emoji: "🔥", count: 3, lastUsed: Date.now() },
      ])
    );

    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />);

    expect(screen.getByTestId("frequent-category")).toBeInTheDocument();
    expect(screen.getByText("Frequently Used")).toBeInTheDocument();
  });

  it("does not show frequently used section when empty", () => {
    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />);

    expect(screen.queryByTestId("frequent-category")).toBeNull();
    expect(screen.queryByText("Frequently Used")).toBeNull();
  });

  it("shows frequent emoji category tab when there are frequent emoji", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ emoji: "🎉", count: 5, lastUsed: Date.now() }])
    );

    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />);

    const tabs = screen.getByTestId("category-tabs");
    expect(within(tabs).getByLabelText("Frequently used")).toBeInTheDocument();
  });

  it("searches emoji by keyword", async () => {
    const user = userEvent.setup();
    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />);

    const searchInput = screen.getByPlaceholderText("Search emoji...");
    await user.type(searchInput, "fire");

    // Should show search results with fire emoji
    const emojiList = screen.getByRole("listbox");
    expect(within(emojiList).getByLabelText("🔥")).toBeInTheDocument();

    // Category tabs should be hidden during search
    expect(screen.queryByTestId("category-tabs")).toBeNull();
  });

  it("shows no results message for unmatched search", async () => {
    const user = userEvent.setup();
    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />);

    const searchInput = screen.getByPlaceholderText("Search emoji...");
    await user.type(searchInput, "xyznonexistent");

    expect(screen.getByText("No emoji found")).toBeInTheDocument();
  });

  it("searches by multiple keywords", async () => {
    const user = userEvent.setup();
    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />);

    const searchInput = screen.getByPlaceholderText("Search emoji...");
    await user.type(searchInput, "heart");

    const emojiList = screen.getByRole("listbox");
    expect(within(emojiList).getByLabelText("❤️")).toBeInTheDocument();
  });

  it("selects emoji from search results", async () => {
    const user = userEvent.setup();
    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />);

    const searchInput = screen.getByPlaceholderText("Search emoji...");
    await user.type(searchInput, "fire");

    const fireEmoji = screen.getByLabelText("🔥");
    await user.click(fireEmoji);

    expect(onSelect).toHaveBeenCalledWith("🔥");
  });

  it("closes picker on Escape key", async () => {
    const user = userEvent.setup();
    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />);

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes picker on click outside", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <div>
        <div data-testid="outside">Outside</div>
        <EmojiPicker onSelect={onSelect} onClose={onClose} />
      </div>
    );

    const outside = screen.getByTestId("outside");
    await user.click(outside);

    expect(onClose).toHaveBeenCalled();
  });

  it("renders category tab buttons for each category", () => {
    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />);

    const tabs = screen.getByTestId("category-tabs");
    expect(within(tabs).getByLabelText("Smileys & People")).toBeInTheDocument();
    expect(within(tabs).getByLabelText("Animals & Nature")).toBeInTheDocument();
    expect(within(tabs).getByLabelText("Food & Drink")).toBeInTheDocument();
    expect(within(tabs).getByLabelText("Activities")).toBeInTheDocument();
    expect(within(tabs).getByLabelText("Travel & Places")).toBeInTheDocument();
    expect(within(tabs).getByLabelText("Objects")).toBeInTheDocument();
    expect(within(tabs).getByLabelText("Symbols & Flags")).toBeInTheDocument();
  });

  it("restores categories when search is cleared", async () => {
    const user = userEvent.setup();
    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />);

    const searchInput = screen.getByPlaceholderText("Search emoji...");

    // Type to search
    await user.type(searchInput, "fire");
    expect(screen.queryByTestId("category-tabs")).toBeNull();

    // Clear search
    await user.clear(searchInput);
    expect(screen.getByTestId("category-tabs")).toBeInTheDocument();
    expect(screen.getByTestId("category-smileys")).toBeInTheDocument();
  });

  it("records usage and updates frequent section on emoji selection", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <EmojiPicker onSelect={onSelect} onClose={onClose} />
    );

    // Initially no frequent section
    expect(screen.queryByTestId("frequent-category")).toBeNull();

    // Click an emoji
    const smileysSection = screen.getByTestId("category-smileys");
    const emoji = within(smileysSection).getAllByRole("option")[0];
    await user.click(emoji);

    // Re-render to pick up the updated localStorage
    rerender(<EmojiPicker onSelect={onSelect} onClose={onClose} />);

    // Now frequent section should appear
    expect(screen.getByTestId("frequent-category")).toBeInTheDocument();
  });
});
