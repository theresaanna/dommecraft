"use client";

import { useCallback, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
} from "lexical";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import useToolbarState from "./lexical/useToolbarState";
import BlockTypeDropdown from "./lexical/BlockTypeDropdown";
import AlignmentDropdown from "./lexical/AlignmentDropdown";
import ColorPickerDropdown from "./lexical/ColorPickerDropdown";
import LinkDialog from "./lexical/LinkDialog";
import InsertDropdown from "./lexical/InsertDropdown";
import ToolbarDivider from "./lexical/ToolbarDivider";

function ToolbarButton({
  onClick,
  label,
  active,
  disabled,
  children,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={`rounded px-2 py-1 text-sm ${
        disabled
          ? "cursor-not-allowed text-zinc-400 dark:text-zinc-600"
          : active
            ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50"
            : "text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

export default function LexicalEditorToolbar() {
  const [editor] = useLexicalComposerContext();
  const state = useToolbarState();
  const [showLinkDialog, setShowLinkDialog] = useState(false);

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

  const formatHighlight = useCallback(() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "highlight");
  }, [editor]);

  const clearFormatting = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const nodes = selection.getNodes();
      for (const node of nodes) {
        if ($isTextNode(node)) {
          node.setFormat(0);
          node.setStyle("");
        }
      }
    });
  }, [editor]);

  const insertHorizontalRule = useCallback(() => {
    editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
  }, [editor]);

  const undo = useCallback(() => {
    editor.dispatchCommand(UNDO_COMMAND, undefined);
  }, [editor]);

  const redo = useCallback(() => {
    editor.dispatchCommand(REDO_COMMAND, undefined);
  }, [editor]);

  return (
    <div
      className="flex flex-wrap items-center gap-1 border-b border-zinc-300 px-2 py-1 dark:border-zinc-700"
      role="toolbar"
      aria-label="Text formatting"
    >
      <ToolbarButton
        onClick={undo}
        label="Undo"
        disabled={!state.canUndo}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 10h10a5 5 0 015 5v0a5 5 0 01-5 5H7" />
          <path d="M7 6l-4 4 4 4" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={redo}
        label="Redo"
        disabled={!state.canRedo}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M21 10H11a5 5 0 00-5 5v0a5 5 0 005 5h6" />
          <path d="M17 6l4 4-4 4" />
        </svg>
      </ToolbarButton>
      <ToolbarDivider />

      <BlockTypeDropdown blockType={state.blockType} />
      <ToolbarDivider />

      <ToolbarButton onClick={formatBold} label="Bold" active={state.isBold}>
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        onClick={formatItalic}
        label="Italic"
        active={state.isItalic}
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        onClick={formatUnderline}
        label="Underline"
        active={state.isUnderline}
      >
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={formatStrikethrough}
        label="Strikethrough"
        active={state.isStrikethrough}
      >
        <span className="line-through">S</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={formatHighlight}
        label="Highlight"
        active={state.isHighlight}
      >
        <span className="rounded bg-yellow-200 px-0.5 text-xs dark:bg-yellow-800">
          H
        </span>
      </ToolbarButton>
      <ToolbarButton onClick={clearFormatting} label="Clear formatting">
        <span className="text-xs">T</span>
        <span className="text-[10px]">x</span>
      </ToolbarButton>
      <ToolbarDivider />

      <div className="relative">
        <ToolbarButton
          onClick={() => setShowLinkDialog(!showLinkDialog)}
          label="Link"
          active={state.isLink}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
        </ToolbarButton>
        {showLinkDialog && (
          <LinkDialog
            isLink={state.isLink}
            onClose={() => setShowLinkDialog(false)}
          />
        )}
      </div>
      <ToolbarDivider />

      <ColorPickerDropdown
        label="Text color"
        styleProperty="color"
        currentColor={state.textColor}
      />
      <ColorPickerDropdown
        label="Background color"
        styleProperty="background-color"
        currentColor={state.bgColor}
      />
      <ToolbarDivider />

      <AlignmentDropdown alignment={state.alignment} />
      <ToolbarDivider />

      <ToolbarButton onClick={insertHorizontalRule} label="Horizontal rule">
        <span className="text-xs">&#8213;</span>
      </ToolbarButton>

      <InsertDropdown />
    </div>
  );
}
