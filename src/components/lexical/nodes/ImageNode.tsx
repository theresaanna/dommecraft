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
import { DecoratorNode, createCommand, LexicalCommand, $getNodeByKey } from "lexical";
import { type ReactNode, useState, useRef, useCallback, useEffect } from "react";

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

const MIN_WIDTH = 100;

function ImageComponent({
  src,
  altText,
  width,
  height,
  nodeKey,
  editor,
}: {
  src: string;
  altText: string;
  width?: number;
  height?: number;
  nodeKey: NodeKey;
  editor: LexicalEditor;
}) {
  const [isSelected, setIsSelected] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(width);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragState = useRef<{
    startX: number;
    startWidth: number;
    direction: number;
  } | null>(null);

  // Sync width from node when it changes externally
  useEffect(() => {
    setCurrentWidth(width);
  }, [width]);

  // Click outside to deselect
  useEffect(() => {
    if (!isSelected) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSelected(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSelected]);

  const handleSelect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSelected(true);
  }, []);

  const commitWidth = useCallback(
    (newWidth: number) => {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.setWidthHeight(newWidth, undefined);
        }
      });
    },
    [editor, nodeKey]
  );

  const handleDragStart = useCallback(
    (e: React.MouseEvent, direction: number) => {
      e.preventDefault();
      e.stopPropagation();

      const startWidth = currentWidth || imgRef.current?.naturalWidth || 400;
      dragState.current = { startX: e.clientX, startWidth, direction };

      function onMouseMove(moveEvent: MouseEvent) {
        if (!dragState.current) return;
        const dx = (moveEvent.clientX - dragState.current.startX) * dragState.current.direction;
        const maxWidth = containerRef.current?.parentElement?.clientWidth || 800;
        const newWidth = Math.max(MIN_WIDTH, Math.min(maxWidth, dragState.current.startWidth + dx));
        setCurrentWidth(newWidth);
      }

      function onMouseUp(upEvent: MouseEvent) {
        if (!dragState.current) return;
        const dx = (upEvent.clientX - dragState.current.startX) * dragState.current.direction;
        const maxWidth = containerRef.current?.parentElement?.clientWidth || 800;
        const newWidth = Math.max(MIN_WIDTH, Math.min(maxWidth, dragState.current.startWidth + dx));
        dragState.current = null;
        setCurrentWidth(newWidth);
        commitWidth(newWidth);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [currentWidth, commitWidth]
  );

  const handleStyle: React.CSSProperties = {
    position: "absolute",
    width: 10,
    height: 10,
    backgroundColor: "white",
    border: "2px solid #3b82f6",
    borderRadius: 2,
    zIndex: 10,
  };

  return (
    <div
      ref={containerRef}
      onClick={handleSelect}
      className="relative inline-block my-2"
      style={{ width: currentWidth ? `${currentWidth}px` : undefined }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={altText}
        className="max-w-full rounded block"
        style={{
          width: currentWidth ? "100%" : undefined,
          height: "auto",
        }}
        draggable={false}
      />
      {isSelected && (
        <>
          {/* Selection border */}
          <div
            className="pointer-events-none absolute inset-0 rounded"
            style={{ border: "2px solid #3b82f6" }}
          />
          {/* Top-left */}
          <div
            style={{ ...handleStyle, top: -5, left: -5, cursor: "nwse-resize" }}
            onMouseDown={(e) => handleDragStart(e, -1)}
          />
          {/* Top-right */}
          <div
            style={{ ...handleStyle, top: -5, right: -5, cursor: "nesw-resize" }}
            onMouseDown={(e) => handleDragStart(e, 1)}
          />
          {/* Bottom-left */}
          <div
            style={{ ...handleStyle, bottom: -5, left: -5, cursor: "nesw-resize" }}
            onMouseDown={(e) => handleDragStart(e, -1)}
          />
          {/* Bottom-right */}
          <div
            style={{ ...handleStyle, bottom: -5, right: -5, cursor: "nwse-resize" }}
            onMouseDown={(e) => handleDragStart(e, 1)}
          />
        </>
      )}
    </div>
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

  setWidthHeight(width: number, height?: number): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
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

  decorate(editor: LexicalEditor): ReactNode {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        width={this.__width}
        height={this.__height}
        nodeKey={this.__key}
        editor={editor}
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
