import {
  $isTextNode,
  DOMConversion,
  DOMConversionMap,
  DOMConversionOutput,
  NodeKey,
  TextNode,
  SerializedTextNode,
} from "lexical";

export class ExtendedTextNode extends TextNode {
  constructor(text: string, key?: NodeKey) {
    super(text, key);
  }

  static getType(): string {
    return "extended-text";
  }

  static clone(node: ExtendedTextNode): ExtendedTextNode {
    return new ExtendedTextNode(node.__text, node.__key);
  }

  static importDOM(): DOMConversionMap | null {
    const importers = TextNode.importDOM();
    return {
      ...importers,
      span: () => ({
        conversion: patchStyleConversion(importers?.span),
        priority: 1 as const,
      }),
    };
  }

  static importJSON(serializedNode: SerializedTextNode): ExtendedTextNode {
    return TextNode.importJSON(serializedNode) as ExtendedTextNode;
  }

  exportJSON(): SerializedTextNode {
    return super.exportJSON();
  }
}

function patchStyleConversion(
  originalDOMConverter?: (
    node: HTMLElement
  ) => DOMConversion<HTMLElement> | null
): (node: HTMLElement) => DOMConversionOutput | null {
  return (node: HTMLElement): DOMConversionOutput | null => {
    const originalResult = originalDOMConverter?.(node);
    if (!originalResult) {
      return null;
    }
    const originalOutput = originalResult.conversion(node);
    if (!originalOutput) {
      return originalOutput;
    }

    const { forChild, after, node: lexicalNode } = originalOutput;
    const style = node.style?.cssText;

    return {
      forChild: (childLexicalNode, parent) => {
        const result = forChild
          ? forChild(childLexicalNode, parent)
          : childLexicalNode;
        if ($isTextNode(result) && style) {
          result.setStyle(style);
        }
        return result;
      },
      after,
      node: lexicalNode,
    };
  };
}
