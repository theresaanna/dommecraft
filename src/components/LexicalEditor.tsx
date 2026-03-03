"use client";

import { useEffect } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { TableNode, TableRowNode, TableCellNode } from "@lexical/table";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $getRoot, $insertNodes, EditorState } from "lexical";
import LexicalEditorToolbar from "./LexicalEditorToolbar";
import { ImageNode } from "./lexical/nodes/ImageNode";
import {
  CollapsibleContainerNode,
  CollapsibleTitleNode,
  CollapsibleContentNode,
} from "./lexical/nodes/CollapsibleNodes";
import {
  ColumnsLayoutNode,
  ColumnsLayoutColumnNode,
} from "./lexical/nodes/ColumnsLayoutNodes";
import { StickyNoteNode } from "./lexical/nodes/StickyNoteNode";
import ImagePlugin from "./lexical/plugins/ImagePlugin";
import CollapsiblePlugin from "./lexical/plugins/CollapsiblePlugin";
import ColumnsLayoutPlugin from "./lexical/plugins/ColumnsLayoutPlugin";
import StickyNotePlugin from "./lexical/plugins/StickyNotePlugin";

const theme = {
  paragraph: "mb-1",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    code: "rounded bg-zinc-100 px-1 py-0.5 font-mono text-sm dark:bg-zinc-800",
    highlight: "bg-yellow-200 dark:bg-yellow-800",
  },
  list: {
    ul: "list-disc ml-4",
    ol: "list-decimal ml-4",
    listitem: "ml-2",
    checklist: "list-none ml-0",
    listitemChecked:
      "lexical-listitem-checked line-through ml-0 relative pl-6 text-zinc-500 dark:text-zinc-400",
    listitemUnchecked: "lexical-listitem-unchecked ml-0 relative pl-6",
  },
  heading: {
    h1: "text-2xl font-bold mb-2",
    h2: "text-xl font-bold mb-1.5",
    h3: "text-lg font-bold mb-1",
  },
  quote:
    "border-l-4 border-zinc-300 pl-4 italic text-zinc-600 dark:border-zinc-600 dark:text-zinc-400 my-2",
  code: "block rounded-md bg-zinc-100 p-3 font-mono text-sm dark:bg-zinc-800 my-2 overflow-x-auto",
  link: "text-blue-600 underline cursor-pointer dark:text-blue-400",
  horizontalrule: "my-4 border-t border-zinc-300 dark:border-zinc-700",
  table:
    "border-collapse w-full my-2 border border-zinc-300 dark:border-zinc-600",
  tableCell:
    "border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600",
  tableCellHeader:
    "border border-zinc-300 bg-zinc-100 px-2 py-1 text-sm font-semibold dark:border-zinc-600 dark:bg-zinc-800",
  image: "my-2",
};

function InitialContentPlugin({ initialHtml }: { initialHtml: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!initialHtml) return;

    editor.update(() => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(initialHtml, "text/html");
      const nodes = $generateNodesFromDOM(editor, dom);
      const root = $getRoot();
      root.clear();
      $insertNodes(nodes);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function LexicalEditor({
  initialContent,
  onChange,
}: {
  initialContent?: string;
  onChange: (html: string) => void;
}) {
  const initialConfig = {
    namespace: "NoteEditor",
    theme,
    nodes: [
      ListNode,
      ListItemNode,
      HeadingNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      LinkNode,
      AutoLinkNode,
      HorizontalRuleNode,
      TableNode,
      TableRowNode,
      TableCellNode,
      ImageNode,
      CollapsibleContainerNode,
      CollapsibleTitleNode,
      CollapsibleContentNode,
      ColumnsLayoutNode,
      ColumnsLayoutColumnNode,
      StickyNoteNode,
    ],
    onError: (error: Error) => {
      console.error("Lexical error:", error);
    },
  };

  function handleChange(
    editorState: EditorState,
    editor: ReturnType<typeof useLexicalComposerContext>[0]
  ) {
    editorState.read(() => {
      const html = $generateHtmlFromNodes(editor);
      onChange(html);
    });
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="rounded-md border border-zinc-300 dark:border-zinc-700">
        <LexicalEditorToolbar />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="min-h-[150px] px-3 py-2 text-sm text-zinc-900 outline-none dark:bg-zinc-900 dark:text-zinc-50"
                aria-label="Note content"
              />
            }
            ErrorBoundary={({ children }) => <>{children}</>}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <LinkPlugin />
        <ClickableLinkPlugin />
        <HorizontalRulePlugin />
        <TablePlugin />
        <ImagePlugin />
        <CollapsiblePlugin />
        <ColumnsLayoutPlugin />
        <StickyNotePlugin />
        <OnChangePlugin onChange={handleChange} />
        {initialContent && (
          <InitialContentPlugin initialHtml={initialContent} />
        )}
      </div>
    </LexicalComposer>
  );
}
