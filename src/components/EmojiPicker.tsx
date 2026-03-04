"use client";

import { useState, useRef, useEffect } from "react";
import { EMOJI_CATEGORIES, searchEmoji } from "@/lib/emoji-data";
import { useFrequentEmoji } from "@/hooks/use-frequent-emoji";

type EmojiPickerProps = {
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("frequent");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { getFrequentEmojis, recordUsage } = useFrequentEmoji();
  const frequentEmojis = getFrequentEmojis();

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const searchResults = search ? searchEmoji(search) : [];
  const isSearching = search.length > 0;

  function handleEmojiClick(emoji: string) {
    recordUsage(emoji);
    onSelect(emoji);
  }

  function scrollToCategory(categoryId: string) {
    setActiveCategory(categoryId);
    const el = categoryRefs.current[categoryId];
    if (el && gridRef.current) {
      gridRef.current.scrollTo({
        top: el.offsetTop - gridRef.current.offsetTop,
        behavior: "smooth",
      });
    }
  }

  // Track which category is visible on scroll
  function handleScroll() {
    if (!gridRef.current || isSearching) return;
    const scrollTop = gridRef.current.scrollTop + gridRef.current.offsetTop;

    const categories = frequentEmojis.length > 0
      ? ["frequent", ...EMOJI_CATEGORIES.map((c) => c.id)]
      : EMOJI_CATEGORIES.map((c) => c.id);

    for (let i = categories.length - 1; i >= 0; i--) {
      const el = categoryRefs.current[categories[i]];
      if (el && el.offsetTop <= scrollTop + 10) {
        setActiveCategory(categories[i]);
        break;
      }
    }
  }

  return (
    <div
      ref={pickerRef}
      data-testid="emoji-picker"
      className="flex w-72 flex-col rounded-lg border border-zinc-200 bg-white/60 backdrop-blur-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-800/60"
    >
      {/* Search */}
      <div className="border-b border-zinc-200 p-2 dark:border-zinc-700">
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emoji..."
          aria-label="Search emoji"
          className="w-full rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-400"
        />
      </div>

      {/* Category tabs */}
      {!isSearching && (
        <div
          data-testid="category-tabs"
          className="flex gap-0.5 overflow-x-auto border-b border-zinc-200 px-1 py-1 dark:border-zinc-700"
        >
          {frequentEmojis.length > 0 && (
            <button
              onClick={() => scrollToCategory("frequent")}
              aria-label="Frequently used"
              title="Frequently used"
              className={`shrink-0 rounded p-1 text-sm ${
                activeCategory === "frequent"
                  ? "bg-zinc-200 dark:bg-zinc-600"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-700"
              }`}
            >
              🕐
            </button>
          )}
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => scrollToCategory(cat.id)}
              aria-label={cat.name}
              title={cat.name}
              className={`shrink-0 rounded p-1 text-sm ${
                activeCategory === cat.id
                  ? "bg-zinc-200 dark:bg-zinc-600"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-700"
              }`}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div
        ref={gridRef}
        onScroll={handleScroll}
        className="h-56 overflow-y-auto p-1"
        role="listbox"
        aria-label="Emoji list"
      >
        {isSearching ? (
          <>
            {searchResults.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
                No emoji found
              </p>
            ) : (
              <div className="grid grid-cols-8 gap-0.5">
                {searchResults.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiClick(emoji)}
                    role="option"
                    aria-label={emoji}
                    className="rounded p-1 text-center text-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Frequently used */}
            {frequentEmojis.length > 0 && (
              <div
                ref={(el) => { categoryRefs.current["frequent"] = el; }}
                data-testid="frequent-category"
              >
                <p className="px-1 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Frequently Used
                </p>
                <div className="grid grid-cols-8 gap-0.5">
                  {frequentEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiClick(emoji)}
                      role="option"
                      aria-label={emoji}
                      className="rounded p-1 text-center text-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* All categories */}
            {EMOJI_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                ref={(el) => { categoryRefs.current[cat.id] = el; }}
                data-testid={`category-${cat.id}`}
              >
                <p className="px-1 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {cat.name}
                </p>
                <div className="grid grid-cols-8 gap-0.5">
                  {cat.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiClick(emoji)}
                      role="option"
                      aria-label={emoji}
                      className="rounded p-1 text-center text-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
