"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection } from "lexical";
import { TOGGLE_LINK_COMMAND, $isLinkNode } from "@lexical/link";

export default function LinkDialog({
  isLink,
  onClose,
}: {
  isLink: boolean;
  onClose: () => void;
}) {
  const [editor] = useLexicalComposerContext();
  const [url, setUrl] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  // Pre-populate URL from existing link
  useEffect(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const node = selection.anchor.getNode();
      const parent = node.getParent();
      if ($isLinkNode(parent)) {
        setUrl(parent.getURL());
      } else if ($isLinkNode(node)) {
        setUrl(node.getURL());
      }
    });
  }, [editor]);

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

  const handleApply = useCallback(() => {
    if (url.trim()) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.trim());
    }
    onClose();
  }, [editor, url, onClose]);

  const handleRemove = useCallback(() => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    onClose();
  }, [editor, onClose]);

  return (
    <div
      ref={dialogRef}
      className="absolute left-0 top-full z-20 mt-1 w-72 rounded-md border border-zinc-200 bg-white/60 backdrop-blur-sm p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-800/60"
    >
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        URL
      </label>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleApply();
          }
        }}
        placeholder="https://example.com"
        autoFocus
        className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
      />
      <div className="mt-2 flex justify-end gap-2">
        {isLink && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Remove
          </button>
        )}
        <button
          type="button"
          onClick={handleApply}
          className="rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
