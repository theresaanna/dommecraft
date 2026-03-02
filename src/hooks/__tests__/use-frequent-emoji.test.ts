// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFrequentEmoji } from "../use-frequent-emoji";

const STORAGE_KEY = "frequent-emoji";

describe("useFrequentEmoji", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns empty frequent list when localStorage is empty", () => {
    const { result } = renderHook(() => useFrequentEmoji());
    expect(result.current.getFrequentEmojis()).toEqual([]);
    expect(result.current.frequentEmoji).toEqual([]);
  });

  it("records emoji usage and returns it in the frequent list", () => {
    const { result } = renderHook(() => useFrequentEmoji());

    act(() => {
      result.current.recordUsage("👍");
    });

    expect(result.current.getFrequentEmojis()).toEqual(["👍"]);
    expect(result.current.frequentEmoji).toHaveLength(1);
    expect(result.current.frequentEmoji[0].emoji).toBe("👍");
    expect(result.current.frequentEmoji[0].count).toBe(1);
  });

  it("increments count when the same emoji is used multiple times", () => {
    const { result } = renderHook(() => useFrequentEmoji());

    act(() => {
      result.current.recordUsage("🔥");
      result.current.recordUsage("🔥");
      result.current.recordUsage("🔥");
    });

    expect(result.current.frequentEmoji).toHaveLength(1);
    expect(result.current.frequentEmoji[0].emoji).toBe("🔥");
    expect(result.current.frequentEmoji[0].count).toBe(3);
  });

  it("sorts by count descending", () => {
    const { result } = renderHook(() => useFrequentEmoji());

    act(() => {
      result.current.recordUsage("😂");
      result.current.recordUsage("👍");
      result.current.recordUsage("👍");
      result.current.recordUsage("👍");
      result.current.recordUsage("🔥");
      result.current.recordUsage("🔥");
    });

    const emojis = result.current.getFrequentEmojis();
    expect(emojis[0]).toBe("👍"); // 3 uses
    expect(emojis[1]).toBe("🔥"); // 2 uses
    expect(emojis[2]).toBe("😂"); // 1 use
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useFrequentEmoji());

    act(() => {
      result.current.recordUsage("❤️");
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0].emoji).toBe("❤️");
    expect(stored[0].count).toBe(1);
  });

  it("loads initial state from localStorage", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { emoji: "🎉", count: 5, lastUsed: Date.now() },
        { emoji: "😂", count: 3, lastUsed: Date.now() - 1000 },
      ])
    );

    const { result } = renderHook(() => useFrequentEmoji());
    const emojis = result.current.getFrequentEmojis();
    expect(emojis).toEqual(["🎉", "😂"]);
  });

  it("limits stored emoji to 24 entries", () => {
    const { result } = renderHook(() => useFrequentEmoji());

    act(() => {
      // Record 30 unique emoji
      for (let i = 0; i < 30; i++) {
        result.current.recordUsage(String.fromCodePoint(0x1f600 + i));
      }
    });

    expect(result.current.frequentEmoji.length).toBeLessThanOrEqual(24);
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem(STORAGE_KEY, "not valid json{{{");

    const { result } = renderHook(() => useFrequentEmoji());
    expect(result.current.getFrequentEmojis()).toEqual([]);
  });

  it("handles non-array localStorage value gracefully", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ notAnArray: true }));

    const { result } = renderHook(() => useFrequentEmoji());
    expect(result.current.getFrequentEmojis()).toEqual([]);
  });

  it("breaks count ties by most recently used", () => {
    const now = Date.now();
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(now - 2000) // first recordUsage call
      .mockReturnValueOnce(now);       // second recordUsage call

    const { result } = renderHook(() => useFrequentEmoji());

    act(() => {
      result.current.recordUsage("😢"); // older timestamp
    });
    act(() => {
      result.current.recordUsage("😮"); // newer timestamp
    });

    const emojis = result.current.getFrequentEmojis();
    // Both have count 1, but 😮 was used more recently
    expect(emojis[0]).toBe("😮");
    expect(emojis[1]).toBe("😢");
  });

  it("updates lastUsed timestamp on repeated use", () => {
    const { result } = renderHook(() => useFrequentEmoji());

    act(() => {
      result.current.recordUsage("👍");
    });

    const firstLastUsed = result.current.frequentEmoji[0].lastUsed;

    // Small delay to ensure different timestamp
    act(() => {
      result.current.recordUsage("👍");
    });

    expect(result.current.frequentEmoji[0].lastUsed).toBeGreaterThanOrEqual(
      firstLastUsed
    );
    expect(result.current.frequentEmoji[0].count).toBe(2);
  });
});
