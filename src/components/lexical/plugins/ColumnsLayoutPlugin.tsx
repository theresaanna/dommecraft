"use client";

import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodes, COMMAND_PRIORITY_EDITOR } from "lexical";
import {
  INSERT_COLUMNS_LAYOUT_COMMAND,
  $createColumnsWithContent,
} from "../nodes/ColumnsLayoutNodes";

export default function ColumnsLayoutPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      INSERT_COLUMNS_LAYOUT_COMMAND,
      (payload) => {
        const columnsLayout = $createColumnsWithContent(payload.columns);
        $insertNodes([columnsLayout]);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
}
