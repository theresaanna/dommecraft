"use client";

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
} from "lexical";
import {
  ElementNode,
  createCommand,
  LexicalCommand,
  $createParagraphNode,
} from "lexical";

export const INSERT_COLLAPSIBLE_COMMAND: LexicalCommand<void> =
  createCommand("INSERT_COLLAPSIBLE_COMMAND");

// ── CollapsibleContainerNode ──
export class CollapsibleContainerNode extends ElementNode {
  __open: boolean;

  static getType(): string {
    return "collapsible-container";
  }

  static clone(node: CollapsibleContainerNode): CollapsibleContainerNode {
    return new CollapsibleContainerNode(node.__open, node.__key);
  }

  constructor(open: boolean = true, key?: NodeKey) {
    super(key);
    this.__open = open;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const el = document.createElement("details");
    el.open = this.__open;
    el.setAttribute("data-lexical-collapsible", "true");
    return el;
  }

  updateDOM(prevNode: CollapsibleContainerNode, dom: HTMLElement): boolean {
    if (prevNode.__open !== this.__open) {
      (dom as HTMLDetailsElement).open = this.__open;
    }
    return false;
  }

  static importJSON(serialized: SerializedElementNode): CollapsibleContainerNode {
    const node = $createCollapsibleContainerNode(true);
    return node;
  }

  exportJSON(): SerializedElementNode {
    return {
      ...super.exportJSON(),
      type: "collapsible-container",
      version: 1,
    };
  }

  exportDOM(): DOMExportOutput {
    const el = document.createElement("details");
    el.open = this.__open;
    el.setAttribute("data-lexical-collapsible", "true");
    return { element: el };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      details: (domNode: HTMLElement) => {
        if (domNode.getAttribute("data-lexical-collapsible") !== "true") {
          return null;
        }
        return {
          conversion: (): DOMConversionOutput | null => {
            const node = $createCollapsibleContainerNode(
              (domNode as HTMLDetailsElement).open
            );
            return { node };
          },
          priority: 1,
        };
      },
    };
  }

  setOpen(open: boolean): void {
    const writable = this.getWritable();
    writable.__open = open;
  }

  getOpen(): boolean {
    return this.__open;
  }

  isShadowRoot(): boolean {
    return true;
  }
}

// ── CollapsibleTitleNode ──
export class CollapsibleTitleNode extends ElementNode {
  static getType(): string {
    return "collapsible-title";
  }

  static clone(node: CollapsibleTitleNode): CollapsibleTitleNode {
    return new CollapsibleTitleNode(node.__key);
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const el = document.createElement("summary");
    el.className = "cursor-pointer font-medium";
    return el;
  }

  updateDOM(): boolean {
    return false;
  }

  static importJSON(): CollapsibleTitleNode {
    return $createCollapsibleTitleNode();
  }

  exportJSON(): SerializedElementNode {
    return {
      ...super.exportJSON(),
      type: "collapsible-title",
      version: 1,
    };
  }

  exportDOM(): DOMExportOutput {
    const el = document.createElement("summary");
    return { element: el };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      summary: () => ({
        conversion: (): DOMConversionOutput | null => {
          return { node: $createCollapsibleTitleNode() };
        },
        priority: 1,
      }),
    };
  }

  collapseAtStart(): boolean {
    return true;
  }
}

// ── CollapsibleContentNode ──
export class CollapsibleContentNode extends ElementNode {
  static getType(): string {
    return "collapsible-content";
  }

  static clone(node: CollapsibleContentNode): CollapsibleContentNode {
    return new CollapsibleContentNode(node.__key);
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const el = document.createElement("div");
    el.className = "pl-4 py-1";
    return el;
  }

  updateDOM(): boolean {
    return false;
  }

  static importJSON(): CollapsibleContentNode {
    return $createCollapsibleContentNode();
  }

  exportJSON(): SerializedElementNode {
    return {
      ...super.exportJSON(),
      type: "collapsible-content",
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

export function $createCollapsibleContainerNode(
  open: boolean = true
): CollapsibleContainerNode {
  return new CollapsibleContainerNode(open);
}

export function $createCollapsibleTitleNode(): CollapsibleTitleNode {
  return new CollapsibleTitleNode();
}

export function $createCollapsibleContentNode(): CollapsibleContentNode {
  return new CollapsibleContentNode();
}

export function $isCollapsibleContainerNode(
  node: LexicalNode | null | undefined
): node is CollapsibleContainerNode {
  return node instanceof CollapsibleContainerNode;
}

export function $isCollapsibleTitleNode(
  node: LexicalNode | null | undefined
): node is CollapsibleTitleNode {
  return node instanceof CollapsibleTitleNode;
}

export function $isCollapsibleContentNode(
  node: LexicalNode | null | undefined
): node is CollapsibleContentNode {
  return node instanceof CollapsibleContentNode;
}

export function $createCollapsibleNodes(): CollapsibleContainerNode {
  const container = $createCollapsibleContainerNode(true);
  const title = $createCollapsibleTitleNode();
  const content = $createCollapsibleContentNode();
  const paragraph = $createParagraphNode();
  content.append(paragraph);
  container.append(title, content);
  return container;
}
