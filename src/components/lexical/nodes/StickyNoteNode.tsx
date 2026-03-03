"use client";

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { DecoratorNode, createCommand, LexicalCommand } from "lexical";
import type { ReactNode } from "react";
import { useState } from "react";

export type StickyNoteColor = "yellow" | "pink" | "blue" | "green";

export type InsertStickyPayload = { color?: StickyNoteColor };

export const INSERT_STICKY_NOTE_COMMAND: LexicalCommand<InsertStickyPayload> =
  createCommand("INSERT_STICKY_NOTE_COMMAND");

type SerializedStickyNoteNode = Spread<
  { color: StickyNoteColor; text: string },
  SerializedLexicalNode
>;

const COLOR_MAP: Record<StickyNoteColor, { bg: string; border: string }> = {
  yellow: { bg: "#fef9c3", border: "#fde047" },
  pink: { bg: "#fce7f3", border: "#f9a8d4" },
  blue: { bg: "#dbeafe", border: "#93c5fd" },
  green: { bg: "#dcfce7", border: "#86efac" },
};

function StickyNoteComponent({
  color,
  initialText,
  onTextChange,
}: {
  color: StickyNoteColor;
  initialText: string;
  onTextChange: (text: string) => void;
}) {
  const [text, setText] = useState(initialText);
  const colors = COLOR_MAP[color];

  return (
    <div
      className="my-2 inline-block w-64 rounded-md p-3 shadow-md"
      style={{
        backgroundColor: colors.bg,
        borderLeft: `4px solid ${colors.border}`,
      }}
    >
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onTextChange(e.target.value);
        }}
        className="w-full resize-none border-none bg-transparent text-sm text-zinc-800 outline-none"
        rows={3}
        placeholder="Write something..."
      />
    </div>
  );
}

function $convertStickyElement(
  domNode: HTMLElement
): DOMConversionOutput | null {
  const color =
    (domNode.getAttribute("data-color") as StickyNoteColor) || "yellow";
  const text = domNode.textContent || "";
  const node = $createStickyNoteNode(color, text);
  return { node };
}

export class StickyNoteNode extends DecoratorNode<ReactNode> {
  __color: StickyNoteColor;
  __text: string;

  static getType(): string {
    return "sticky-note";
  }

  static clone(node: StickyNoteNode): StickyNoteNode {
    return new StickyNoteNode(node.__color, node.__text, node.__key);
  }

  constructor(
    color: StickyNoteColor = "yellow",
    text: string = "",
    key?: NodeKey
  ) {
    super(key);
    this.__color = color;
    this.__text = text;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const span = document.createElement("span");
    span.style.display = "inline-block";
    return span;
  }

  updateDOM(): false {
    return false;
  }

  static importJSON(serialized: SerializedStickyNoteNode): StickyNoteNode {
    return $createStickyNoteNode(serialized.color, serialized.text);
  }

  exportJSON(): SerializedStickyNoteNode {
    return {
      type: "sticky-note",
      version: 1,
      color: this.__color,
      text: this.__text,
    };
  }

  exportDOM(): DOMExportOutput {
    const el = document.createElement("div");
    el.setAttribute("data-lexical-sticky", "true");
    el.setAttribute("data-color", this.__color);
    el.textContent = this.__text;
    const colors = COLOR_MAP[this.__color];
    el.style.backgroundColor = colors.bg;
    el.style.borderLeft = `4px solid ${colors.border}`;
    el.style.padding = "0.75rem";
    el.style.borderRadius = "0.375rem";
    el.style.display = "inline-block";
    el.style.width = "16rem";
    el.style.whiteSpace = "pre-wrap";
    return { element: el };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (domNode.getAttribute("data-lexical-sticky") !== "true") {
          return null;
        }
        return {
          conversion: $convertStickyElement,
          priority: 1,
        };
      },
    };
  }

  decorate(_editor: LexicalEditor): ReactNode {
    return (
      <StickyNoteComponent
        color={this.__color}
        initialText={this.__text}
        onTextChange={(text) => {
          _editor.update(() => {
            const writable = this.getWritable();
            writable.__text = text;
          });
        }}
      />
    );
  }
}

export function $createStickyNoteNode(
  color: StickyNoteColor = "yellow",
  text: string = ""
): StickyNoteNode {
  return new StickyNoteNode(color, text);
}

export function $isStickyNoteNode(
  node: LexicalNode | null | undefined
): node is StickyNoteNode {
  return node instanceof StickyNoteNode;
}
