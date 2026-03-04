"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection } from "lexical";

type ContextMenuPluginProps = {
  projectId: string;
  projects?: { id: string; name: string }[];
  onTaskCreated?: () => void;
};

type MenuState = {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
};

export default function ContextMenuPlugin({
  projectId,
  projects,
  onTaskCreated,
}: ContextMenuPluginProps): React.ReactElement | null {
  const [editor] = useLexicalComposerContext();
  const [menuState, setMenuState] = useState<MenuState>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: "",
  });
  const [showSubmenu, setShowSubmenu] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setMenuState((prev) => ({ ...prev, visible: false }));
    setShowSubmenu(false);
    setFeedback(null);
  }, []);

  // Listen for contextmenu on editor root
  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    const handleContextMenu = (e: MouseEvent) => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || selection.isCollapsed()) return;

        const selectedText = selection.getTextContent().trim();
        if (!selectedText) return;

        e.preventDefault();

        // Viewport boundary check
        const menuWidth = 200;
        const menuHeight = 40;
        const x =
          e.clientX + menuWidth > window.innerWidth
            ? window.innerWidth - menuWidth - 8
            : e.clientX;
        const y =
          e.clientY + menuHeight > window.innerHeight
            ? e.clientY - menuHeight
            : e.clientY;

        setMenuState({ visible: true, x, y, selectedText });
        setShowSubmenu(false);
        setFeedback(null);
      });
    };

    rootElement.addEventListener("contextmenu", handleContextMenu);
    return () =>
      rootElement.removeEventListener("contextmenu", handleContextMenu);
  }, [editor]);

  // Close on click outside, Escape, scroll
  useEffect(() => {
    if (!menuState.visible) return;

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    const handleScroll = () => closeMenu();

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [menuState.visible, closeMenu]);

  // Auto-close after feedback
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => closeMenu(), 1500);
    return () => clearTimeout(timer);
  }, [feedback, closeMenu]);

  async function handleAddTask(targetProjectId: string) {
    try {
      const res = await fetch(
        `/api/hub/projects/${targetProjectId}/tasks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: menuState.selectedText }),
        }
      );
      if (!res.ok) {
        setFeedback({ type: "error", message: "Failed to add task" });
        return;
      }
      setFeedback({ type: "success", message: "Task added" });
      onTaskCreated?.();
    } catch {
      setFeedback({ type: "error", message: "Failed to add task" });
    }
  }

  if (!menuState.visible) return null;

  const multipleProjects = projects && projects.length > 1;

  return (
    <div
      ref={menuRef}
      data-testid="context-menu"
      className="fixed z-50 w-52 rounded-md border border-zinc-200 bg-white/40 backdrop-blur-sm py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900/60"
      style={{ left: menuState.x, top: menuState.y }}
    >
      {feedback ? (
        <div
          data-testid="context-menu-feedback"
          className={`px-3 py-2 text-base ${
            feedback.type === "success"
              ? "text-green-600 dark:text-green-400"
              : "text-red-500 dark:text-red-400"
          }`}
        >
          {feedback.message}
        </div>
      ) : multipleProjects ? (
        <div
          className="relative"
          onMouseEnter={() => setShowSubmenu(true)}
          onMouseLeave={() => setShowSubmenu(false)}
        >
          <button
            data-testid="add-task-button"
            onClick={() => setShowSubmenu(!showSubmenu)}
            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-base text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Add as Task
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5"
            >
              <path
                fillRule="evenodd"
                d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {showSubmenu && (
            <div
              data-testid="project-submenu"
              className="absolute left-full top-0 ml-0.5 w-48 rounded-md border border-zinc-200 bg-white/40 backdrop-blur-sm py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900/60"
            >
              {/* Current project first */}
              {projects
                .slice()
                .sort((a, b) =>
                  a.id === projectId ? -1 : b.id === projectId ? 1 : 0
                )
                .map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleAddTask(project.id)}
                    className={`block w-full truncate px-3 py-1.5 text-left text-base hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      project.id === projectId
                        ? "font-medium text-zinc-900 dark:text-zinc-50"
                        : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {project.name}
                  </button>
                ))}
            </div>
          )}
        </div>
      ) : (
        <button
          data-testid="add-task-button"
          onClick={() => handleAddTask(projectId)}
          className="flex w-full items-center px-3 py-1.5 text-left text-base text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Add as Task
        </button>
      )}
    </div>
  );
}
