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

export type ImagePayload = {
  src: string;
  altText: string;
  width?: number;
  height?: number;
  key?: NodeKey;
};

export type SerializedImageNode = Spread<
  {
    src: string;
    altText: string;
    width?: number;
    height?: number;
  },
  SerializedLexicalNode
>;

export const INSERT_IMAGE_COMMAND: LexicalCommand<ImagePayload> =
  createCommand("INSERT_IMAGE_COMMAND");

function ImageComponent({
  src,
  altText,
  width,
  height,
}: {
  src: string;
  altText: string;
  width?: number;
  height?: number;
}) {
  return (
    <img
      src={src}
      alt={altText}
      width={width}
      height={height}
      className="my-2 max-w-full rounded"
      draggable={false}
    />
  );
}

function $convertImageElement(domNode: HTMLElement): DOMConversionOutput | null {
  const img = domNode as HTMLImageElement;
  const src = img.getAttribute("src");
  if (!src) return null;
  const node = $createImageNode({
    src,
    altText: img.getAttribute("alt") || "",
    width: img.width || undefined,
    height: img.height || undefined,
  });
  return { node };
}

export class ImageNode extends DecoratorNode<ReactNode> {
  __src: string;
  __altText: string;
  __width?: number;
  __height?: number;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__key
    );
  }

  constructor(
    src: string,
    altText: string,
    width?: number,
    height?: number,
    key?: NodeKey
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__width = width;
    this.__height = height;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const span = document.createElement("span");
    span.style.display = "inline-block";
    return span;
  }

  updateDOM(): false {
    return false;
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    return $createImageNode({
      src: serializedNode.src,
      altText: serializedNode.altText,
      width: serializedNode.width,
      height: serializedNode.height,
    });
  }

  exportJSON(): SerializedImageNode {
    return {
      type: "image",
      version: 1,
      src: this.__src,
      altText: this.__altText,
      width: this.__width,
      height: this.__height,
    };
  }

  exportDOM(): DOMExportOutput {
    const img = document.createElement("img");
    img.setAttribute("src", this.__src);
    img.setAttribute("alt", this.__altText);
    if (this.__width) img.setAttribute("width", String(this.__width));
    if (this.__height) img.setAttribute("height", String(this.__height));
    return { element: img };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: $convertImageElement,
        priority: 0,
      }),
    };
  }

  decorate(_editor: LexicalEditor): ReactNode {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        width={this.__width}
        height={this.__height}
      />
    );
  }
}

export function $createImageNode(payload: ImagePayload): ImageNode {
  return new ImageNode(
    payload.src,
    payload.altText,
    payload.width,
    payload.height,
    payload.key
  );
}

export function $isImageNode(
  node: LexicalNode | null | undefined
): node is ImageNode {
  return node instanceof ImageNode;
}
