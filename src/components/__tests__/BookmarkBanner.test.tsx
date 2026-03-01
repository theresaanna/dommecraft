// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BookmarkBanner from "../BookmarkBanner";

describe("BookmarkBanner", () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => storage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key];
      }),
    });
  });

  it("renders banner when not previously dismissed", () => {
    render(<BookmarkBanner />);

    expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument();
  });

  it("does not render when already dismissed in localStorage", () => {
    storage["bookmark-banner-dismissed"] = "true";

    render(<BookmarkBanner />);

    expect(screen.queryByRole("button", { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it("hides on dismiss click and writes to localStorage", async () => {
    const user = userEvent.setup();

    render(<BookmarkBanner />);

    const dismissBtn = screen.getByRole("button", { name: /dismiss/i });
    await user.click(dismissBtn);

    expect(localStorage.setItem).toHaveBeenCalledWith(
      "bookmark-banner-dismissed",
      "true"
    );
    expect(screen.queryByRole("button", { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it("shows desktop bookmark instructions by default", () => {
    render(<BookmarkBanner />);

    expect(screen.getByText(/bookmark this page/i)).toBeInTheDocument();
  });

  it("shows iOS instructions for iPhone user agent", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      writable: true,
      configurable: true,
    });

    render(<BookmarkBanner />);

    expect(screen.getByText(/add to home screen/i)).toBeInTheDocument();
  });

  it("shows Android instructions for Android user agent", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 14)",
      writable: true,
      configurable: true,
    });

    render(<BookmarkBanner />);

    expect(screen.getByText(/add to home screen/i)).toBeInTheDocument();
  });
});
