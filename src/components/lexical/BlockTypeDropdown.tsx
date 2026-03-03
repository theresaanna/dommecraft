"use client";

import { useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
} from "lexical";
import { $createHeadingNode } from "@lexical/rich-text";
import { $createQuoteNode } from "@lexical/rich-text";
import { $createCodeNode } from "@lexical/code";
import { $setBlocksType } from "@lexical/selection";
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import type { BlockType } from "./useToolbarState";

const BLOCK_TYPE_OPTIONS: { value: BlockType; label: string }[] = [
  { value: "paragraph", label: "Normal" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "bullet", label: "Bullet List" },
  { value: "number", label: "Numbered List" },
  { value: "check", label: "Check List" },
  { value: "quote", label: "Quote" },
  { value: "code", label: "Code Block" },
];

export default function BlockTypeDropdown({
  blockType,
}: {
  blockType: BlockType;
}) {
  const [editor] = useLexicalComposerContext();

  const applyBlockType = useCallback(
    (type: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        switch (type) {
          case "paragraph":
            if (
              blockType === "bullet" ||
              blockType === "number" ||
              blockType === "check"
            ) {
              editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
            } else {
              $setBlocksType(selection, () => $createParagraphNode());
            }
            break;
          case "h1":
            $setBlocksType(selection, () => $createHeadingNode("h1"));
            break;
          case "h2":
            $setBlocksType(selection, () => $createHeadingNode("h2"));
            break;
          case "h3":
            $setBlocksType(selection, () => $createHeadingNode("h3"));
            break;
          case "bullet":
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
            break;
          case "number":
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
            break;
          case "check":
            editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
            break;
          case "quote":
            $setBlocksType(selection, () => $createQuoteNode());
            break;
          case "code":
            $setBlocksType(selection, () => $createCodeNode());
            break;
        }
      });
    },
    [editor, blockType]
  );

  return (
    <select
      aria-label="Block type"
      value={blockType}
      onChange={(e) => applyBlockType(e.target.value)}
      className="rounded border border-zinc-300 bg-transparent px-1.5 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
    >
      {BLOCK_TYPE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
