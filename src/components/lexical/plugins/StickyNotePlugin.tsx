"use client";

import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodes, COMMAND_PRIORITY_EDITOR } from "lexical";
import {
  INSERT_STICKY_NOTE_COMMAND,
  $createStickyNoteNode,
} from "../nodes/StickyNoteNode";

export default function StickyNotePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      INSERT_STICKY_NOTE_COMMAND,
      (payload) => {
        const stickyNode = $createStickyNoteNode(payload.color || "yellow");
        $insertNodes([stickyNode]);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
}
