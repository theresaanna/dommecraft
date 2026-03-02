import { describe, it, expect } from "vitest";
import {
  EMOJI_CATEGORIES,
  ALL_EMOJIS,
  searchEmoji,
} from "../emoji-data";

describe("emoji-data", () => {
  describe("EMOJI_CATEGORIES", () => {
    it("has multiple categories", () => {
      expect(EMOJI_CATEGORIES.length).toBeGreaterThanOrEqual(8);
    });

    it("each category has an id, name, icon, and emoji array", () => {
      for (const cat of EMOJI_CATEGORIES) {
        expect(cat.id).toBeTruthy();
        expect(cat.name).toBeTruthy();
        expect(cat.icon).toBeTruthy();
        expect(cat.emojis.length).toBeGreaterThan(0);
      }
    });

    it("has unique category IDs", () => {
      const ids = EMOJI_CATEGORIES.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("ALL_EMOJIS", () => {
    it("is a flat array of all emoji from all categories", () => {
      const totalFromCategories = EMOJI_CATEGORIES.reduce(
        (sum, c) => sum + c.emojis.length,
        0
      );
      expect(ALL_EMOJIS.length).toBe(totalFromCategories);
    });

    it("contains common emoji", () => {
      expect(ALL_EMOJIS).toContain("😀");
      expect(ALL_EMOJIS).toContain("👍");
      expect(ALL_EMOJIS).toContain("❤️");
      expect(ALL_EMOJIS).toContain("🔥");
    });
  });

  describe("searchEmoji", () => {
    it("returns empty array for empty query", () => {
      expect(searchEmoji("")).toEqual([]);
      expect(searchEmoji("  ")).toEqual([]);
    });

    it("finds emoji by keyword", () => {
      const results = searchEmoji("fire");
      expect(results).toContain("🔥");
    });

    it("finds emoji by partial keyword", () => {
      const results = searchEmoji("hap");
      expect(results).toContain("😀");
    });

    it("is case insensitive", () => {
      const lower = searchEmoji("fire");
      const upper = searchEmoji("FIRE");
      expect(lower).toEqual(upper);
    });

    it("finds heart emoji", () => {
      const results = searchEmoji("heart");
      expect(results).toContain("❤️");
      expect(results.length).toBeGreaterThan(1);
    });

    it("finds emoji for 'laugh'", () => {
      const results = searchEmoji("laugh");
      expect(results).toContain("😂");
      expect(results).toContain("🤣");
    });

    it("finds emoji for 'dog'", () => {
      const results = searchEmoji("dog");
      expect(results).toContain("🐶");
    });

    it("finds emoji for 'pizza'", () => {
      const results = searchEmoji("pizza");
      expect(results).toContain("🍕");
    });

    it("finds emoji for 'star'", () => {
      const results = searchEmoji("star");
      expect(results).toContain("⭐");
      expect(results).toContain("🌟");
    });

    it("returns empty for completely unrelated search", () => {
      const results = searchEmoji("xyznonexistent");
      expect(results).toEqual([]);
    });

    it("finds by category name", () => {
      const results = searchEmoji("activities");
      expect(results.length).toBeGreaterThan(0);
      expect(results).toContain("⚽");
    });

    it("finds thumbs emoji", () => {
      const results = searchEmoji("thumbs");
      expect(results).toContain("👍");
      expect(results).toContain("👎");
    });

    it("returns unique results", () => {
      const results = searchEmoji("love");
      const unique = new Set(results);
      expect(results.length).toBe(unique.size);
    });
  });
});
