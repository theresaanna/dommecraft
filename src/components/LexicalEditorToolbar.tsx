"use client";

import { useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { FORMAT_TEXT_COMMAND } from "lexical";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";

function ToolbarButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
    >
      {children}
    </button>
  );
}

export default function LexicalEditorToolbar() {
  const [editor] = useLexicalComposerContext();

  const formatBold = useCallback(() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
  }, [editor]);

  const formatItalic = useCallback(() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
  }, [editor]);

  const formatUnderline = useCallback(() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
  }, [editor]);

  const formatStrikethrough = useCallback(() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
  }, [editor]);

  const insertBulletList = useCallback(() => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  }, [editor]);

  const insertNumberedList = useCallback(() => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  }, [editor]);

  return (
    <div
      className="flex flex-wrap gap-1 border-b border-zinc-300 px-2 py-1 dark:border-zinc-700"
      role="toolbar"
      aria-label="Text formatting"
    >
      <ToolbarButton onClick={formatBold} label="Bold">
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton onClick={formatItalic} label="Italic">
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton onClick={formatUnderline} label="Underline">
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton onClick={formatStrikethrough} label="Strikethrough">
        <span className="line-through">S</span>
      </ToolbarButton>
      <div className="mx-1 w-px bg-zinc-300 dark:bg-zinc-700" />
      <ToolbarButton onClick={insertBulletList} label="Bullet list">
        &bull; List
      </ToolbarButton>
      <ToolbarButton onClick={insertNumberedList} label="Numbered list">
        1. List
      </ToolbarButton>
    </div>
  );
}
