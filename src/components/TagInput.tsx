"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export type TagInputProps = {
  label: string;
  name: string;
  placeholder?: string;
  suggestions?: string[];
  value: string[];
  onChange: (tags: string[]) => void;
};

export default function TagInput({
  label,
  name,
  placeholder,
  suggestions = [],
  value,
  onChange,
}: TagInputProps) {
  const [input, setInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = input.trim()
    ? suggestions.filter(
        (s) =>
          s.toLowerCase().includes(input.trim().toLowerCase()) &&
          !value.includes(s)
      )
    : suggestions.filter((s) => !value.includes(s));

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed || value.includes(trimmed)) return;
      onChange([...value, trimmed]);
      setInput("");
      setHighlightIndex(-1);
    },
    [value, onChange]
  );

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < filtered.length) {
        addTag(filtered[highlightIndex]);
      } else if (input.trim()) {
        addTag(input);
      }
    } else if (e.key === "," || e.key === "Tab") {
      if (input.trim()) {
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          addTag(filtered[highlightIndex]);
        } else {
          addTag(input);
        }
      }
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev < filtered.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setHighlightIndex(-1);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
        setHighlightIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(-1);
  }, [input]);

  return (
    <div ref={containerRef}>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      {/* Hidden inputs for form submission */}
      {value.map((tag) => (
        <input key={tag} type="hidden" name={name} value={tag} />
      ))}
      <div
        className="mt-1 flex flex-wrap items-center gap-1 rounded-md border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="ml-0.5 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              aria-label={`Remove ${tag}`}
            >
              &times;
            </button>
          </span>
        ))}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ""}
            className="w-full min-w-[120px] border-none bg-transparent py-0.5 text-sm text-zinc-900 outline-none placeholder-zinc-500 dark:text-zinc-50 dark:placeholder-zinc-400"
          />
          {showDropdown && filtered.length > 0 && (
            <ul
              role="listbox"
              className="absolute left-0 top-full z-10 mt-1 max-h-48 w-64 overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            >
              {filtered.map((suggestion, i) => (
                <li
                  key={suggestion}
                  role="option"
                  aria-selected={i === highlightIndex}
                  className={`cursor-pointer px-3 py-1.5 text-sm ${
                    i === highlightIndex
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addTag(suggestion);
                  }}
                  onMouseEnter={() => setHighlightIndex(i)}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
