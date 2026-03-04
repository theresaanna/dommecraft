"use client";

import { useState, useRef, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { INSERT_COLLAPSIBLE_COMMAND } from "./nodes/CollapsibleNodes";
import { INSERT_COLUMNS_LAYOUT_COMMAND } from "./nodes/ColumnsLayoutNodes";
import { INSERT_STICKY_NOTE_COMMAND } from "./nodes/StickyNoteNode";
import ImageUploadDialog from "./ImageUploadDialog";
import TableInsertDialog from "./TableInsertDialog";

type SubDialog = "image" | "table" | null;

export default function InsertDropdown() {
  const [editor] = useLexicalComposerContext();
  const [isOpen, setIsOpen] = useState(false);
  const [subDialog, setSubDialog] = useState<SubDialog>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen && !subDialog) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSubDialog(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, subDialog]);

  function handleSelect(action: string) {
    setIsOpen(false);
    switch (action) {
      case "image":
        setSubDialog("image");
        break;
      case "table":
        setSubDialog("table");
        break;
      case "columns-2":
        editor.dispatchCommand(INSERT_COLUMNS_LAYOUT_COMMAND, { columns: 2 });
        break;
      case "columns-3":
        editor.dispatchCommand(INSERT_COLUMNS_LAYOUT_COMMAND, { columns: 3 });
        break;
      case "collapsible":
        editor.dispatchCommand(INSERT_COLLAPSIBLE_COMMAND, undefined);
        break;
      case "sticky-yellow":
        editor.dispatchCommand(INSERT_STICKY_NOTE_COMMAND, { color: "yellow" });
        break;
      case "sticky-pink":
        editor.dispatchCommand(INSERT_STICKY_NOTE_COMMAND, { color: "pink" });
        break;
      case "sticky-blue":
        editor.dispatchCommand(INSERT_STICKY_NOTE_COMMAND, { color: "blue" });
        break;
      case "sticky-green":
        editor.dispatchCommand(INSERT_STICKY_NOTE_COMMAND, { color: "green" });
        break;
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSubDialog(null);
        }}
        aria-label="Insert"
        className="rounded px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        +
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-md border border-zinc-200 bg-white/60 backdrop-blur-sm py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800/60">
          <MenuItem label="Image" onClick={() => handleSelect("image")} />
          <MenuItem label="Table" onClick={() => handleSelect("table")} />
          <div className="my-1 border-t border-zinc-100 dark:border-zinc-700" />
          <MenuItem
            label="2 Columns"
            onClick={() => handleSelect("columns-2")}
          />
          <MenuItem
            label="3 Columns"
            onClick={() => handleSelect("columns-3")}
          />
          <div className="my-1 border-t border-zinc-100 dark:border-zinc-700" />
          <MenuItem
            label="Collapsible"
            onClick={() => handleSelect("collapsible")}
          />
          <div className="my-1 border-t border-zinc-100 dark:border-zinc-700" />
          <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Sticky Note
          </div>
          <div className="flex gap-1 px-3 py-1">
            {(
              [
                ["yellow", "#fef9c3"],
                ["pink", "#fce7f3"],
                ["blue", "#dbeafe"],
                ["green", "#dcfce7"],
              ] as const
            ).map(([color, bg]) => (
              <button
                key={color}
                type="button"
                onClick={() => handleSelect(`sticky-${color}`)}
                aria-label={`${color} sticky note`}
                className="h-6 w-6 rounded border border-zinc-300 dark:border-zinc-600"
                style={{ backgroundColor: bg }}
              />
            ))}
          </div>
        </div>
      )}

      {subDialog === "image" && (
        <ImageUploadDialog
          onClose={() => setSubDialog(null)}
        />
      )}
      {subDialog === "table" && (
        <TableInsertDialog onClose={() => setSubDialog(null)} />
      )}
    </div>
  );
}

function MenuItem({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
    >
      {label}
    </button>
  );
}
