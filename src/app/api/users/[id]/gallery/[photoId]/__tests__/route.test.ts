import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    galleryPhoto: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/blob-helpers", () => ({
  deleteBlob: vi.fn(),
}));

import { DELETE } from "../route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteBlob } from "@/lib/blob-helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindUnique = vi.mocked(prisma.galleryPhoto.findUnique);
const mockDelete = vi.mocked(prisma.galleryPhoto.delete);
const mockDeleteBlob = vi.mocked(deleteBlob);

const dummyRequest = new Request(
  "http://localhost:3000/api/users/user-1/gallery/photo-1",
  { method: "DELETE" }
);

describe("DELETE /api/users/[id]/gallery/[photoId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await DELETE(dummyRequest, {
      params: Promise.resolve({ id: "user-1", photoId: "photo-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when user is not the profile owner", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2" },
      expires: "",
    } as never);

    const res = await DELETE(dummyRequest, {
      params: Promise.resolve({ id: "user-1", photoId: "photo-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 404 when photo not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue(null);

    const res = await DELETE(dummyRequest, {
      params: Promise.resolve({ id: "user-1", photoId: "photo-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Photo not found");
  });

  it("returns 404 when photo belongs to a different user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "photo-1",
      userId: "user-3",
      fileUrl: "https://blob.test/photo.jpg",
    } as never);

    const res = await DELETE(dummyRequest, {
      params: Promise.resolve({ id: "user-1", photoId: "photo-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Photo not found");
  });

  it("deletes photo and blob on success", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "photo-1",
      userId: "user-1",
      fileUrl: "https://blob.test/photo.jpg",
    } as never);
    mockDelete.mockResolvedValue({} as never);

    const res = await DELETE(dummyRequest, {
      params: Promise.resolve({ id: "user-1", photoId: "photo-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteBlob).toHaveBeenCalledWith("https://blob.test/photo.jpg");
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "photo-1" } });
  });
});
