"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection } from "lexical";
import { $patchStyleText } from "@lexical/selection";

const COLORS = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#cccccc",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#06b6d4",
  "#6366f1",
  "#a855f7",
  "#f43f5e",
];

export default function ColorPickerDropdown({
  label,
  styleProperty,
  currentColor,
}: {
  label: string;
  styleProperty: "color" | "background-color";
  currentColor: string;
}) {
  const [editor] = useLexicalComposerContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const applyColor = useCallback(
    (color: string | null) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, {
            [styleProperty]: color,
          });
        }
      });
      setIsOpen(false);
    },
    [editor, styleProperty]
  );

  const isTextColor = styleProperty === "color";
  const displayColor = currentColor || (isTextColor ? "#000000" : "transparent");

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={label}
        className="flex flex-col items-center rounded px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        <span className="text-xs font-semibold">
          {isTextColor ? "A" : "A"}
        </span>
        <span
          className="mt-0.5 block h-1 w-4 rounded-sm"
          style={{
            backgroundColor:
              displayColor === "transparent" ? undefined : displayColor,
            border:
              displayColor === "transparent"
                ? "1px dashed currentColor"
                : undefined,
          }}
        />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-md border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-1.5 grid grid-cols-6 gap-1">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => applyColor(color)}
                aria-label={color}
                className="h-5 w-5 rounded-sm border border-zinc-300 dark:border-zinc-600"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => applyColor(null)}
            className="w-full rounded px-2 py-1 text-left text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            Remove {isTextColor ? "color" : "highlight"}
          </button>
        </div>
      )}
    </div>
  );
}
