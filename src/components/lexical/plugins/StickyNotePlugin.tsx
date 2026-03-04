"use client";

import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getNodeByKey,
  $getNearestNodeFromDOMNode,
  $insertNodes,
  COMMAND_PRIORITY_EDITOR,
} from "lexical";
import {
  INSERT_STICKY_NOTE_COMMAND,
  $createStickyNoteNode,
  STICKY_NOTE_DRAG_TYPE,
} from "../nodes/StickyNoteNode";

export default function StickyNotePlugin(): null {
  const [editor] = useLexicalComposerContext();
  const dropLineRef = useRef<HTMLDivElement | null>(null);
  const dropTargetRef = useRef<{
    node: HTMLElement;
    position: "before" | "after";
  } | null>(null);

  useEffect(() => {
    return editor.registerCommand(
      INSERT_STICKY_NOTE_COMMAND,
      (payload) => {
        const stickyNode = $createStickyNoteNode(payload.color || "yellow");
        $insertNodes([stickyNode]);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    const editorContainer = rootElement.parentElement;
    if (!editorContainer) return;

    // Create drop indicator line
    const dropLine = document.createElement("div");
    dropLine.style.cssText =
      "position:absolute;left:0;right:0;height:3px;background:#8b5cf6;border-radius:2px;pointer-events:none;display:none;z-index:10;transition:top 0.05s ease";
    editorContainer.style.position = "relative";
    editorContainer.appendChild(dropLine);
    dropLineRef.current = dropLine;

    function isStickyDrag(e: DragEvent): boolean {
      return e.dataTransfer?.types.includes(STICKY_NOTE_DRAG_TYPE) ?? false;
    }

    function getClosestBlockElement(
      y: number
    ): { element: HTMLElement; position: "before" | "after" } | null {
      const children = rootElement!.children;
      let closest: HTMLElement | null = null;
      let closestDist = Infinity;
      let position: "before" | "after" = "after";

      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        const rect = child.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const dist = Math.abs(y - midY);

        if (dist < closestDist) {
          closestDist = dist;
          closest = child;
          position = y < midY ? "before" : "after";
        }
      }

      if (!closest) return null;
      return { element: closest, position };
    }

    function showDropLine(element: HTMLElement, position: "before" | "after") {
      if (!dropLineRef.current || !editorContainer) return;
      const containerRect = editorContainer.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const top =
        position === "before"
          ? elementRect.top - containerRect.top - 1
          : elementRect.bottom - containerRect.top + 1;

      dropLineRef.current.style.top = `${top}px`;
      dropLineRef.current.style.display = "block";
    }

    function hideDropLine() {
      if (dropLineRef.current) {
        dropLineRef.current.style.display = "none";
      }
      dropTargetRef.current = null;
    }

    function handleDragOver(e: DragEvent) {
      if (!isStickyDrag(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

      const target = getClosestBlockElement(e.clientY);
      if (target) {
        dropTargetRef.current = {
          node: target.element,
          position: target.position,
        };
        showDropLine(target.element, target.position);
      }
    }

    function handleDrop(e: DragEvent) {
      if (!isStickyDrag(e)) return;
      e.preventDefault();

      const nodeKey = e.dataTransfer?.getData(STICKY_NOTE_DRAG_TYPE);
      const targetInfo = dropTargetRef.current;

      hideDropLine();

      if (!nodeKey || !targetInfo) return;

      editor.update(() => {
        const stickyNode = $getNodeByKey(nodeKey);
        if (!stickyNode) return;

        const targetLexicalNode = $getNearestNodeFromDOMNode(
          targetInfo.node
        );
        if (!targetLexicalNode) return;

        // Get top-level node (direct child of root)
        const topLevelTarget =
          targetLexicalNode.getTopLevelElement() ?? targetLexicalNode;

        // Don't move if dropping on itself
        if (topLevelTarget.getKey() === nodeKey) return;

        stickyNode.remove();

        if (targetInfo.position === "before") {
          topLevelTarget.insertBefore(stickyNode);
        } else {
          topLevelTarget.insertAfter(stickyNode);
        }
      });
    }

    function handleDragLeave(e: DragEvent) {
      if (!isStickyDrag(e)) return;
      // Only hide if leaving the editor container
      const related = e.relatedTarget as HTMLElement | null;
      if (!related || !editorContainer!.contains(related)) {
        hideDropLine();
      }
    }

    rootElement.addEventListener("dragover", handleDragOver);
    rootElement.addEventListener("drop", handleDrop);
    rootElement.addEventListener("dragleave", handleDragLeave);

    return () => {
      rootElement.removeEventListener("dragover", handleDragOver);
      rootElement.removeEventListener("drop", handleDrop);
      rootElement.removeEventListener("dragleave", handleDragLeave);
      dropLine.remove();
    };
  }, [editor]);

  return null;
}
