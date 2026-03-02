import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    galleryPhoto: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "../route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindMany = vi.mocked(prisma.galleryPhoto.findMany);
const mockCreate = vi.mocked(prisma.galleryPhoto.create);

function createPostRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/users/user-1/gallery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const dummyGetRequest = new Request(
  "http://localhost:3000/api/users/user-1/gallery"
);

describe("GET /api/users/[id]/gallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET(dummyGetRequest, {
      params: Promise.resolve({ id: "user-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns photos for any authenticated user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([
      {
        id: "photo-1",
        userId: "user-1",
        fileUrl: "https://blob.test/photo1.jpg",
        mimeType: "image/jpeg",
        fileSize: 1024,
        createdAt: new Date("2025-06-01"),
      },
    ] as never);

    const res = await GET(dummyGetRequest, {
      params: Promise.resolve({ id: "user-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("photo-1");
  });

  it("returns empty array when no photos exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    const res = await GET(dummyGetRequest, {
      params: Promise.resolve({ id: "user-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });
});

describe("POST /api/users/[id]/gallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(
      createPostRequest({ fileUrl: "https://blob.test/photo.jpg", mimeType: "image/jpeg" }),
      { params: Promise.resolve({ id: "user-1" }) }
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when user is not the profile owner", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2" },
      expires: "",
    } as never);

    const res = await POST(
      createPostRequest({ fileUrl: "https://blob.test/photo.jpg", mimeType: "image/jpeg" }),
      { params: Promise.resolve({ id: "user-1" }) }
    );
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 400 when fileUrl is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    const res = await POST(
      createPostRequest({ mimeType: "image/jpeg" }),
      { params: Promise.resolve({ id: "user-1" }) }
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("File URL is required");
  });

  it("returns 400 when mimeType is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    const res = await POST(
      createPostRequest({ fileUrl: "https://blob.test/photo.jpg" }),
      { params: Promise.resolve({ id: "user-1" }) }
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("MIME type is required");
  });

  it("returns 400 when mimeType is not an image", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    const res = await POST(
      createPostRequest({
        fileUrl: "https://blob.test/video.mp4",
        mimeType: "video/mp4",
      }),
      { params: Promise.resolve({ id: "user-1" }) }
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Only image files are allowed");
  });

  it("creates a gallery photo on success", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockCreate.mockResolvedValue({
      id: "photo-1",
      userId: "user-1",
      fileUrl: "https://blob.test/photo.jpg",
      mimeType: "image/jpeg",
      fileSize: 2048,
      createdAt: new Date("2025-06-01"),
    } as never);

    const res = await POST(
      createPostRequest({
        fileUrl: "https://blob.test/photo.jpg",
        mimeType: "image/jpeg",
        fileSize: 2048,
      }),
      { params: Promise.resolve({ id: "user-1" }) }
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("photo-1");
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        fileUrl: "https://blob.test/photo.jpg",
        mimeType: "image/jpeg",
        fileSize: 2048,
      },
    });
  });
});
