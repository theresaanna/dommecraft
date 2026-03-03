"use client";

import { useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
} from "lexical";
import { $isHeadingNode } from "@lexical/rich-text";
import { $isCodeNode } from "@lexical/code";
import { $isLinkNode } from "@lexical/link";
import { $isListNode } from "@lexical/list";
import { $getSelectionStyleValueForProperty } from "@lexical/selection";
import { $findMatchingParent } from "@lexical/utils";

export type BlockType =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "quote"
  | "code"
  | "bullet"
  | "number"
  | "check";

export type ToolbarState = {
  blockType: BlockType;
  alignment: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrikethrough: boolean;
  isHighlight: boolean;
  isLink: boolean;
  textColor: string;
  bgColor: string;
  canUndo: boolean;
  canRedo: boolean;
};

const INITIAL_STATE: ToolbarState = {
  blockType: "paragraph",
  alignment: "left",
  isBold: false,
  isItalic: false,
  isUnderline: false,
  isStrikethrough: false,
  isHighlight: false,
  isLink: false,
  textColor: "",
  bgColor: "",
  canUndo: false,
  canRedo: false,
};

export default function useToolbarState(): ToolbarState {
  const [editor] = useLexicalComposerContext();
  const [state, setState] = useState<ToolbarState>(INITIAL_STATE);

  useEffect(() => {
    const unregisterUndo = editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload: boolean) => {
        setState((prev) => ({ ...prev, canUndo: payload }));
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );

    const unregisterRedo = editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload: boolean) => {
        setState((prev) => ({ ...prev, canRedo: payload }));
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );

    const unregisterUpdate = editor.registerUpdateListener(
      ({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;

          // Inline formats
          const isBold = selection.hasFormat("bold");
          const isItalic = selection.hasFormat("italic");
          const isUnderline = selection.hasFormat("underline");
          const isStrikethrough = selection.hasFormat("strikethrough");
          const isHighlight = selection.hasFormat("highlight");

          // Colors
          const textColor = $getSelectionStyleValueForProperty(
            selection,
            "color",
            ""
          );
          const bgColor = $getSelectionStyleValueForProperty(
            selection,
            "background-color",
            ""
          );

          // Link detection
          const anchorNode = selection.anchor.getNode();
          const parent = anchorNode.getParent();
          const isLink = $isLinkNode(parent) || $isLinkNode(anchorNode);

          // Block type detection
          let blockType: BlockType = "paragraph";
          let alignment = "left";

          const element = $isTextNode(anchorNode)
            ? anchorNode.getParent()
            : anchorNode;

          if (element) {
            // Check for list
            const listParent = $findMatchingParent(element, $isListNode);
            if (listParent && $isListNode(listParent)) {
              const listType = listParent.getListType();
              if (listType === "bullet") blockType = "bullet";
              else if (listType === "number") blockType = "number";
              else if (listType === "check") blockType = "check";
            } else {
              const topElement = anchorNode.getTopLevelElementOrThrow();
              if ($isHeadingNode(topElement)) {
                blockType = topElement.getTag() as BlockType;
              } else if (topElement.getType() === "quote") {
                blockType = "quote";
              } else if ($isCodeNode(topElement)) {
                blockType = "code";
              }

              alignment = topElement.getFormatType() || "left";
            }
          }

          setState((prev) => ({
            ...prev,
            blockType,
            alignment,
            isBold,
            isItalic,
            isUnderline,
            isStrikethrough,
            isHighlight,
            isLink,
            textColor,
            bgColor,
          }));
        });
      }
    );

    return () => {
      unregisterUndo();
      unregisterRedo();
      unregisterUpdate();
    };
  }, [editor]);

  return state;
}
