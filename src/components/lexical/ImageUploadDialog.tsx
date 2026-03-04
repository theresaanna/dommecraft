"use client";

import { useState, useRef, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { INSERT_IMAGE_COMMAND } from "./nodes/ImageNode";

export default function ImageUploadDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const [editor] = useLexicalComposerContext();
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [url, setUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "note-images");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Upload failed");
        return;
      }

      const { url: uploadedUrl } = await res.json();
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
        src: uploadedUrl,
        altText: altText || file.name,
      });
      onClose();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleUrlInsert() {
    if (!url.trim()) return;
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
      src: url.trim(),
      altText: altText || "Image",
    });
    onClose();
  }

  return (
    <div
      ref={dialogRef}
      className="absolute left-0 top-full z-20 mt-1 w-80 rounded-md border border-zinc-200 bg-white/60 backdrop-blur-sm p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-800/60"
    >
      <div className="mb-3 flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`px-3 py-1.5 text-xs font-medium ${
            tab === "upload"
              ? "border-b-2 border-zinc-800 text-zinc-900 dark:border-zinc-200 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          }`}
        >
          Upload
        </button>
        <button
          type="button"
          onClick={() => setTab("url")}
          className={`px-3 py-1.5 text-xs font-medium ${
            tab === "url"
              ? "border-b-2 border-zinc-800 text-zinc-900 dark:border-zinc-200 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          }`}
        >
          URL
        </button>
      </div>

      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Alt text
      </label>
      <input
        type="text"
        value={altText}
        onChange={(e) => setAltText(e.target.value)}
        placeholder="Describe the image"
        className="mt-1 mb-3 w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
      />

      {tab === "upload" ? (
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="w-full text-sm text-zinc-600 file:mr-2 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-700 dark:file:text-zinc-300"
          />
          {uploading && (
            <p className="mt-2 text-xs text-zinc-500">Uploading...</p>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Image URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleUrlInsert();
              }
            }}
            placeholder="https://example.com/image.png"
            autoFocus
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleUrlInsert}
              className="rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Insert
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
