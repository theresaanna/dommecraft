"use client";

import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodes, COMMAND_PRIORITY_EDITOR } from "lexical";
import {
  INSERT_COLLAPSIBLE_COMMAND,
  $createCollapsibleNodes,
} from "../nodes/CollapsibleNodes";

export default function CollapsiblePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      INSERT_COLLAPSIBLE_COMMAND,
      () => {
        const container = $createCollapsibleNodes();
        $insertNodes([container]);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
}
