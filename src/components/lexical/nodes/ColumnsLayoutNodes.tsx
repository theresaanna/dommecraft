"use client";

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  Spread,
} from "lexical";
import {
  ElementNode,
  createCommand,
  LexicalCommand,
  $createParagraphNode,
} from "lexical";

export type InsertColumnsPayload = { columns: number };

export const INSERT_COLUMNS_LAYOUT_COMMAND: LexicalCommand<InsertColumnsPayload> =
  createCommand("INSERT_COLUMNS_LAYOUT_COMMAND");

type SerializedColumnsLayoutNode = Spread<
  { columns: number },
  SerializedElementNode
>;

// ── ColumnsLayoutNode ──
export class ColumnsLayoutNode extends ElementNode {
  __columns: number;

  static getType(): string {
    return "columns-layout";
  }

  static clone(node: ColumnsLayoutNode): ColumnsLayoutNode {
    return new ColumnsLayoutNode(node.__columns, node.__key);
  }

  constructor(columns: number = 2, key?: NodeKey) {
    super(key);
    this.__columns = columns;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const el = document.createElement("div");
    el.style.display = "grid";
    el.style.gridTemplateColumns = `repeat(${this.__columns}, 1fr)`;
    el.style.gap = "1rem";
    el.setAttribute("data-lexical-columns", String(this.__columns));
    return el;
  }

  updateDOM(prevNode: ColumnsLayoutNode, dom: HTMLElement): boolean {
    if (prevNode.__columns !== this.__columns) {
      dom.style.gridTemplateColumns = `repeat(${this.__columns}, 1fr)`;
      dom.setAttribute("data-lexical-columns", String(this.__columns));
    }
    return false;
  }

  static importJSON(serialized: SerializedColumnsLayoutNode): ColumnsLayoutNode {
    return $createColumnsLayoutNode(serialized.columns);
  }

  exportJSON(): SerializedColumnsLayoutNode {
    return {
      ...super.exportJSON(),
      type: "columns-layout",
      version: 1,
      columns: this.__columns,
    };
  }

  exportDOM(): DOMExportOutput {
    const el = document.createElement("div");
    el.style.display = "grid";
    el.style.gridTemplateColumns = `repeat(${this.__columns}, 1fr)`;
    el.style.gap = "1rem";
    el.setAttribute("data-lexical-columns", String(this.__columns));
    return { element: el };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        const cols = domNode.getAttribute("data-lexical-columns");
        if (!cols) return null;
        return {
          conversion: (): DOMConversionOutput | null => {
            const node = $createColumnsLayoutNode(parseInt(cols, 10));
            return { node };
          },
          priority: 1,
        };
      },
    };
  }

  isShadowRoot(): boolean {
    return true;
  }
}

// ── ColumnsLayoutColumnNode ──
export class ColumnsLayoutColumnNode extends ElementNode {
  static getType(): string {
    return "columns-layout-column";
  }

  static clone(node: ColumnsLayoutColumnNode): ColumnsLayoutColumnNode {
    return new ColumnsLayoutColumnNode(node.__key);
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const el = document.createElement("div");
    el.style.minHeight = "2rem";
    el.style.borderLeft = "2px solid var(--columns-border, #e4e4e7)";
    el.style.paddingLeft = "0.75rem";
    return el;
  }

  updateDOM(): boolean {
    return false;
  }

  static importJSON(): ColumnsLayoutColumnNode {
    return $createColumnsLayoutColumnNode();
  }

  exportJSON(): SerializedElementNode {
    return {
      ...super.exportJSON(),
      type: "columns-layout-column",
      version: 1,
    };
  }

  exportDOM(): DOMExportOutput {
    const el = document.createElement("div");
    return { element: el };
  }

  static importDOM(): DOMConversionMap | null {
    return {};
  }

  isShadowRoot(): boolean {
    return true;
  }
}

export function $createColumnsLayoutNode(
  columns: number = 2
): ColumnsLayoutNode {
  return new ColumnsLayoutNode(columns);
}

export function $createColumnsLayoutColumnNode(): ColumnsLayoutColumnNode {
  return new ColumnsLayoutColumnNode();
}

export function $isColumnsLayoutNode(
  node: LexicalNode | null | undefined
): node is ColumnsLayoutNode {
  return node instanceof ColumnsLayoutNode;
}

export function $createColumnsWithContent(
  columns: number
): ColumnsLayoutNode {
  const layout = $createColumnsLayoutNode(columns);
  for (let i = 0; i < columns; i++) {
    const col = $createColumnsLayoutColumnNode();
    col.append($createParagraphNode());
    layout.append(col);
  }
  return layout;
}
