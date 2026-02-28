import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mediaItem: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/api-helpers", () => ({
  verifySubOwnership: vi.fn(),
}));

import { GET, POST } from "@/app/api/subs/[id]/media/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { verifySubOwnership } from "@/lib/api-helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockVerifySubOwnership = vi.mocked(verifySubOwnership);
const mockFindMany = vi.mocked(prisma.mediaItem.findMany);
const mockCreate = vi.mocked(prisma.mediaItem.create);

const routeParams = { params: Promise.resolve({ id: "sub-1" }) };

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/subs/sub-1/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/subs/[id]/media", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/subs/sub-1/media");
    const res = await GET(request, routeParams);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when sub not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockVerifySubOwnership.mockResolvedValue(false);

    const request = new Request("http://localhost:3000/api/subs/sub-1/media");
    const res = await GET(request, routeParams);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Sub profile not found");
  });

  it("returns list of media items", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockVerifySubOwnership.mockResolvedValue(true);

    const mediaItems = [
      { id: "media-1", fileUrl: "https://example.com/a.jpg", fileType: "IMAGE", subId: "sub-1", userId: "user-1" },
      { id: "media-2", fileUrl: "https://example.com/b.mp4", fileType: "VIDEO", subId: "sub-1", userId: "user-1" },
    ];
    mockFindMany.mockResolvedValue(mediaItems as never);

    const request = new Request("http://localhost:3000/api/subs/sub-1/media");
    const res = await GET(request, routeParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(mediaItems);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { subId: "sub-1", userId: "user-1" },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("POST /api/subs/[id]/media", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(
      createRequest({ fileUrl: "https://example.com/a.jpg", fileType: "IMAGE" }),
      routeParams
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when sub not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockVerifySubOwnership.mockResolvedValue(false);

    const res = await POST(
      createRequest({ fileUrl: "https://example.com/a.jpg", fileType: "IMAGE" }),
      routeParams
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Sub profile not found");
  });

  it("returns 400 when fileUrl is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockVerifySubOwnership.mockResolvedValue(true);

    const res = await POST(createRequest({ fileType: "IMAGE" }), routeParams);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("File URL is required");
  });

  it("returns 400 when fileType is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockVerifySubOwnership.mockResolvedValue(true);

    const res = await POST(
      createRequest({ fileUrl: "https://example.com/a.jpg" }),
      routeParams
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("File type is required");
  });

  it("returns 201 on success", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockVerifySubOwnership.mockResolvedValue(true);

    const mediaItem = {
      id: "media-1",
      fileUrl: "https://example.com/a.jpg",
      fileType: "IMAGE",
      userId: "user-1",
      subId: "sub-1",
    };
    mockCreate.mockResolvedValue(mediaItem as never);

    const res = await POST(
      createRequest({ fileUrl: "https://example.com/a.jpg", fileType: "IMAGE" }),
      routeParams
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual(mediaItem);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          subId: "sub-1",
          fileUrl: "https://example.com/a.jpg",
          fileType: "IMAGE",
        }),
      })
    );
  });
});
