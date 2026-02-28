import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { GET, PATCH, DELETE } from "@/app/api/subs/[id]/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindUnique = vi.mocked(prisma.subProfile.findUnique);
const mockUpdate = vi.mocked(prisma.subProfile.update);
const mockDelete = vi.mocked(prisma.subProfile.delete);

function createGetRequest(): Request {
  return new Request("http://localhost:3000/api/subs/sub-1", {
    method: "GET",
  });
}

function createPatchRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/subs/sub-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createDeleteRequest(permanent = false): Request {
  const url = permanent
    ? "http://localhost:3000/api/subs/sub-1?permanent=true"
    : "http://localhost:3000/api/subs/sub-1";
  return new Request(url, { method: "DELETE" });
}

function resolveParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/subs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET(createGetRequest(), resolveParams("sub-1"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when sub not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockFindUnique.mockResolvedValue(null);

    const res = await GET(createGetRequest(), resolveParams("sub-1"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Sub profile not found");
  });

  it("returns full profile with linked data counts on success", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });

    const mockSub = {
      id: "sub-1",
      userId: "user-1",
      fullName: "Test Sub",
      _count: {
        badges: 3,
        mediaItems: 5,
        ratings: 2,
        behaviorScores: 4,
        contracts: 1,
      },
    };
    mockFindUnique.mockResolvedValue(mockSub as never);

    const res = await GET(createGetRequest(), resolveParams("sub-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("sub-1");
    expect(data.fullName).toBe("Test Sub");
    expect(data._count.badges).toBe(3);
    expect(data._count.mediaItems).toBe(5);
    expect(data._count.ratings).toBe(2);
    expect(data._count.behaviorScores).toBe(4);
    expect(data._count.contracts).toBe(1);
  });

  it("scopes query to userId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockFindUnique.mockResolvedValue(null);

    await GET(createGetRequest(), resolveParams("sub-1"));

    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-1", userId: "user-1" },
      })
    );
  });
});

describe("PATCH /api/subs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await PATCH(
      createPatchRequest({ fullName: "Updated" }),
      resolveParams("sub-1")
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
    mockFindUnique.mockResolvedValue(null);

    const res = await PATCH(
      createPatchRequest({ fullName: "Updated" }),
      resolveParams("sub-1")
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Sub profile not found");
  });

  it("updates allowed fields and returns updated profile", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockFindUnique.mockResolvedValue({ id: "sub-1" } as never);

    const updatedSub = {
      id: "sub-1",
      fullName: "Updated Name",
      contactInfo: "new@email.com",
      timezone: "America/New_York",
    };
    mockUpdate.mockResolvedValue(updatedSub as never);

    const res = await PATCH(
      createPatchRequest({
        fullName: "Updated Name",
        contactInfo: "new@email.com",
        timezone: "America/New_York",
      }),
      resolveParams("sub-1")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.fullName).toBe("Updated Name");
    expect(data.contactInfo).toBe("new@email.com");
    expect(data.timezone).toBe("America/New_York");

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: {
        fullName: "Updated Name",
        contactInfo: "new@email.com",
        timezone: "America/New_York",
      },
    });
  });

  it("handles partial updates (only updates provided fields)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockFindUnique.mockResolvedValue({ id: "sub-1" } as never);

    const updatedSub = { id: "sub-1", fullName: "Only Name" };
    mockUpdate.mockResolvedValue(updatedSub as never);

    const res = await PATCH(
      createPatchRequest({ fullName: "Only Name" }),
      resolveParams("sub-1")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.fullName).toBe("Only Name");

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: {
        fullName: "Only Name",
      },
    });
  });
});

describe("DELETE /api/subs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await DELETE(createDeleteRequest(), resolveParams("sub-1"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when sub not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockFindUnique.mockResolvedValue(null);

    const res = await DELETE(createDeleteRequest(), resolveParams("sub-1"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Sub profile not found");
  });

  it("soft-deletes (archives) by default", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockFindUnique.mockResolvedValue({ id: "sub-1" } as never);
    mockUpdate.mockResolvedValue({ id: "sub-1", isArchived: true } as never);

    const res = await DELETE(createDeleteRequest(), resolveParams("sub-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { isArchived: true },
    });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("hard-deletes when permanent=true query param is set", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockFindUnique.mockResolvedValue({ id: "sub-1" } as never);
    mockDelete.mockResolvedValue({ id: "sub-1" } as never);

    const res = await DELETE(
      createDeleteRequest(true),
      resolveParams("sub-1")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "sub-1" } });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
