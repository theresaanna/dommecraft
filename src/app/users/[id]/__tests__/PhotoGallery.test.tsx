// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PhotoGallery from "../PhotoGallery";

const mockPhotos = [
  {
    id: "photo-1",
    fileUrl: "https://blob.test/photo1.jpg",
    mimeType: "image/jpeg",
    fileSize: 1024,
    createdAt: "2025-06-01T00:00:00.000Z",
  },
  {
    id: "photo-2",
    fileUrl: "https://blob.test/photo2.png",
    mimeType: "image/png",
    fileSize: 2048,
    createdAt: "2025-06-02T00:00:00.000Z",
  },
];

describe("PhotoGallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );
  });

  it("renders empty state when no photos", () => {
    render(
      <PhotoGallery photos={[]} userId="user-1" isOwnProfile={false} />
    );

    expect(screen.getByText("No photos yet.")).toBeInTheDocument();
  });

  it("renders photos in grid", () => {
    render(
      <PhotoGallery
        photos={mockPhotos}
        userId="user-1"
        isOwnProfile={false}
      />
    );

    const images = screen.getAllByAltText("Gallery photo");
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute("src", "https://blob.test/photo1.jpg");
    expect(images[1]).toHaveAttribute("src", "https://blob.test/photo2.png");
  });

  it("renders Photos heading", () => {
    render(
      <PhotoGallery photos={[]} userId="user-1" isOwnProfile={false} />
    );

    expect(screen.getByText("Photos")).toBeInTheDocument();
  });

  it("shows Upload Photo button when isOwnProfile is true", () => {
    render(
      <PhotoGallery photos={[]} userId="user-1" isOwnProfile={true} />
    );

    expect(screen.getByText("Upload Photo")).toBeInTheDocument();
  });

  it("does not show Upload Photo button when isOwnProfile is false", () => {
    render(
      <PhotoGallery photos={[]} userId="user-1" isOwnProfile={false} />
    );

    expect(screen.queryByText("Upload Photo")).not.toBeInTheDocument();
  });

  it("shows delete buttons only when isOwnProfile is true", () => {
    render(
      <PhotoGallery
        photos={mockPhotos}
        userId="user-1"
        isOwnProfile={true}
      />
    );

    const deleteButtons = screen.getAllByText("Delete");
    expect(deleteButtons).toHaveLength(2);
  });

  it("does not show delete buttons when isOwnProfile is false", () => {
    render(
      <PhotoGallery
        photos={mockPhotos}
        userId="user-1"
        isOwnProfile={false}
      />
    );

    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("uploads a photo via /api/upload then saves to gallery", async () => {
    const user = userEvent.setup();
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ url: "https://blob.test/new-photo.jpg" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "photo-3",
            fileUrl: "https://blob.test/new-photo.jpg",
            mimeType: "image/jpeg",
            fileSize: 512,
            createdAt: "2025-06-03T00:00:00.000Z",
          }),
      });
    vi.stubGlobal("fetch", mockFetch);

    render(
      <PhotoGallery photos={[]} userId="user-1" isOwnProfile={true} />
    );

    const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
    const input = screen.getByTestId("gallery-file-input");
    await user.upload(input, file);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/upload", {
        method: "POST",
        body: expect.any(FormData),
      });
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/users/user-1/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });

    await waitFor(() => {
      const images = screen.getAllByAltText("Gallery photo");
      expect(images).toHaveLength(1);
      expect(images[0]).toHaveAttribute(
        "src",
        "https://blob.test/new-photo.jpg"
      );
    });
  });

  it("removes photo from display after successful delete", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(
      <PhotoGallery
        photos={mockPhotos}
        userId="user-1"
        isOwnProfile={true}
      />
    );

    expect(screen.getAllByAltText("Gallery photo")).toHaveLength(2);

    const deleteButtons = screen.getAllByText("Delete");
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/users/user-1/gallery/photo-1",
        { method: "DELETE" }
      );
    });

    await waitFor(() => {
      expect(screen.getAllByAltText("Gallery photo")).toHaveLength(1);
    });
  });

  it("shows error when upload fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Upload failed" }),
      })
    );

    render(
      <PhotoGallery photos={[]} userId="user-1" isOwnProfile={true} />
    );

    const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
    const input = screen.getByTestId("gallery-file-input");
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText("Upload failed")).toBeInTheDocument();
    });
  });
});
