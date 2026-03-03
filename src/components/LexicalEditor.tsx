"use client";

import { useEffect } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode } from "@lexical/rich-text";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $getRoot, $insertNodes, EditorState } from "lexical";
import LexicalEditorToolbar from "./LexicalEditorToolbar";

const theme = {
  paragraph: "mb-1",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
  },
  list: {
    ul: "list-disc ml-4",
    ol: "list-decimal ml-4",
    listitem: "ml-2",
  },
  heading: {
    h1: "text-2xl font-bold",
    h2: "text-xl font-bold",
    h3: "text-lg font-bold",
  },
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
    nodes: [ListNode, ListItemNode, HeadingNode],
    onError: (error: Error) => {
      console.error("Lexical error:", error);
    },
  };

  function handleChange(editorState: EditorState, editor: ReturnType<typeof useLexicalComposerContext>[0]) {
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
        <OnChangePlugin onChange={handleChange} />
        {initialContent && (
          <InitialContentPlugin initialHtml={initialContent} />
        )}
      </div>
    </LexicalComposer>
  );
}
