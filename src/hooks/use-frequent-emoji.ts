"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "frequent-emoji";
const MAX_FREQUENT = 24;

export type EmojiUsage = {
  emoji: string;
  count: number;
  lastUsed: number;
};

function loadFromStorage(): EmojiUsage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveToStorage(data: EmojiUsage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Sorts frequent emoji by a weighted score combining usage count and recency.
 * More recently used and more frequently used emoji appear first.
 */
function sortByFrequency(items: EmojiUsage[]): EmojiUsage[] {
  return [...items].sort((a, b) => {
    // Primary: count descending, secondary: lastUsed descending
    if (b.count !== a.count) return b.count - a.count;
    return b.lastUsed - a.lastUsed;
  });
}

export function useFrequentEmoji() {
  const [frequentEmoji, setFrequentEmoji] = useState<EmojiUsage[]>(() =>
    sortByFrequency(loadFromStorage())
  );

  const recordUsage = useCallback((emoji: string) => {
    setFrequentEmoji((prev) => {
      const existing = prev.find((e) => e.emoji === emoji);
      let updated: EmojiUsage[];

      if (existing) {
        updated = prev.map((e) =>
          e.emoji === emoji
            ? { ...e, count: e.count + 1, lastUsed: Date.now() }
            : e
        );
      } else {
        updated = [...prev, { emoji, count: 1, lastUsed: Date.now() }];
      }

      const sorted = sortByFrequency(updated).slice(0, MAX_FREQUENT);
      saveToStorage(sorted);
      return sorted;
    });
  }, []);

  const getFrequentEmojis = useCallback((): string[] => {
    return frequentEmoji.map((e) => e.emoji);
  }, [frequentEmoji]);

  return { frequentEmoji, recordUsage, getFrequentEmojis };
}
