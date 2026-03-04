"use client";

import { useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { FORMAT_ELEMENT_COMMAND, ElementFormatType } from "lexical";

const ALIGNMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "justify", label: "Justify" },
];

export default function AlignmentDropdown({
  alignment,
}: {
  alignment: string;
}) {
  const [editor] = useLexicalComposerContext();

  const handleChange = useCallback(
    (value: string) => {
      editor.dispatchCommand(
        FORMAT_ELEMENT_COMMAND,
        value as ElementFormatType
      );
    },
    [editor]
  );

  return (
    <select
      aria-label="Text alignment"
      value={alignment}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded border border-zinc-300 bg-transparent px-1.5 py-1 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
    >
      {ALIGNMENT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
