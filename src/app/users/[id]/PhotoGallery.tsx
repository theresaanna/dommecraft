"use client";

import { useState, useRef } from "react";

type GalleryPhoto = {
  id: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number | null;
  createdAt: string;
};

export default function PhotoGallery({
  photos: initialPhotos,
  userId,
  isOwnProfile,
}: {
  photos: GalleryPhoto[];
  userId: string;
  isOwnProfile: boolean;
}) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "gallery");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        setError(data.error || "Upload failed");
        return;
      }

      const { url } = await uploadRes.json();

      const galleryRes = await fetch(`/api/users/${userId}/gallery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: url,
          mimeType: file.type,
          fileSize: file.size,
        }),
      });

      if (!galleryRes.ok) {
        const data = await galleryRes.json();
        setError(data.error || "Failed to save photo");
        return;
      }

      const photo = await galleryRes.json();
      setPhotos((prev) => [photo, ...prev]);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDelete(photoId: string) {
    try {
      const res = await fetch(`/api/users/${userId}/gallery/${photoId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete photo");
        return;
      }

      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      setError("Failed to delete photo. Please try again.");
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Photos
        </h2>
        {isOwnProfile && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {uploading ? "Uploading..." : "Upload Photo"}
          </button>
        )}
        {isOwnProfile && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            data-testid="gallery-file-input"
          />
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {photos.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          No photos yet.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-700"
            >
              <img
                src={photo.fileUrl}
                alt="Gallery photo"
                className="aspect-square w-full object-cover"
              />
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => handleDelete(photo.id)}
                  className="absolute top-2 right-2 rounded-full bg-black/50 px-2 py-1 text-xs text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
