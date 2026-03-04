"use client";

import { useState, useRef, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { INSERT_TABLE_COMMAND } from "@lexical/table";

export default function TableInsertDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const [editor] = useLexicalComposerContext();
  const [rows, setRows] = useState("3");
  const [cols, setCols] = useState("3");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  function handleInsert() {
    const r = Math.max(1, Math.min(10, parseInt(rows, 10) || 3));
    const c = Math.max(1, Math.min(6, parseInt(cols, 10) || 3));
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      rows: String(r),
      columns: String(c),
      includeHeaders: true,
    });
    onClose();
  }

  return (
    <div
      ref={dialogRef}
      className="absolute left-0 top-full z-20 mt-1 w-56 rounded-md border border-zinc-200 bg-white/40 backdrop-blur-sm p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-800/60"
    >
      <div className="mb-2">
        <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Rows (1-10)
        </label>
        <input
          type="number"
          min="1"
          max="10"
          value={rows}
          onChange={(e) => setRows(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-base dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Columns (1-6)
        </label>
        <input
          type="number"
          min="1"
          max="6"
          value={cols}
          onChange={(e) => setCols(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-base dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleInsert}
          className="rounded bg-zinc-800 px-2 py-1 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Insert Table
        </button>
      </div>
    </div>
  );
}
