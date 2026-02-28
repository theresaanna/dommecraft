import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    subProfile: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { GET, POST } from "@/app/api/subs/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindMany = vi.mocked(prisma.subProfile.findMany);
const mockCreate = vi.mocked(prisma.subProfile.create);

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/subs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/subs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost:3000/api/subs"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns empty array when user has no subs", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    const res = await GET(new Request("http://localhost:3000/api/subs"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("returns subs for authenticated user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const mockSubs = [
      {
        id: "sub-1",
        fullName: "Test Sub",
        contactInfo: "test@example.com",
        arrangementType: ["FINANCIAL"],
        subType: ["ONLINE"],
        timezone: "UTC",
        tags: [],
        isArchived: false,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    ];
    mockFindMany.mockResolvedValue(mockSubs as never);

    const res = await GET(new Request("http://localhost:3000/api/subs"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].fullName).toBe("Test Sub");
  });

  it("passes search query via q param", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(new Request("http://localhost:3000/api/subs?q=test"));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { fullName: { contains: "test", mode: "insensitive" } },
            { contactInfo: { contains: "test", mode: "insensitive" } },
            { privateNotes: { contains: "test", mode: "insensitive" } },
          ],
        }),
      })
    );
  });

  it("filters by sub_type param", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request("http://localhost:3000/api/subs?sub_type=ONLINE")
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          subType: { hasSome: ["ONLINE"] },
        }),
      })
    );
  });

  it("filters by arrangement_type param", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request(
        "http://localhost:3000/api/subs?arrangement_type=FINANCIAL"
      )
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          arrangementType: { hasSome: ["FINANCIAL"] },
        }),
      })
    );
  });

  it("sorts by specified field and order", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request("http://localhost:3000/api/subs?sort=fullName&order=asc")
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { fullName: "asc" },
      })
    );
  });

  it("excludes archived subs by default", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(new Request("http://localhost:3000/api/subs"));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isArchived: false,
        }),
      })
    );
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockRejectedValue(new Error("DB connection failed"));

    const res = await GET(new Request("http://localhost:3000/api/subs"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

describe("POST /api/subs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(createRequest({ fullName: "Test Sub" }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when fullName is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await POST(createRequest({ contactInfo: "test@example.com" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Full name is required");
  });

  it("returns 400 when fullName is empty string", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await POST(createRequest({ fullName: "" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Full name is required");
  });

  it("returns 201 on successful creation with all fields", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const mockSub = {
      id: "sub-1",
      userId: "user-1",
      fullName: "New Sub",
      contactInfo: "sub@example.com",
      arrangementType: ["FINANCIAL"],
      subType: ["ONLINE"],
      timezone: "America/New_York",
      tags: ["tag1"],
      softLimits: ["limit1"],
      hardLimits: ["limit2"],
      preferences: ["pref1"],
      isArchived: false,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };
    mockCreate.mockResolvedValue(mockSub as never);

    const res = await POST(
      createRequest({
        fullName: "New Sub",
        contactInfo: "sub@example.com",
        arrangementType: ["FINANCIAL"],
        subType: ["ONLINE"],
        timezone: "America/New_York",
        tags: ["tag1"],
        softLimits: ["limit1"],
        hardLimits: ["limit2"],
        preferences: ["pref1"],
      })
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.fullName).toBe("New Sub");
    expect(data.contactInfo).toBe("sub@example.com");
  });

  it("sets userId from session", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "session-user-id", role: "DOMME" },
      expires: "",
    } as never);
    mockCreate.mockResolvedValue({
      id: "sub-1",
      userId: "session-user-id",
      fullName: "Test Sub",
    } as never);

    await POST(createRequest({ fullName: "Test Sub" }));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "session-user-id",
        }),
      })
    );
  });

  it("handles array fields correctly", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockCreate.mockResolvedValue({
      id: "sub-1",
      fullName: "Test Sub",
    } as never);

    await POST(
      createRequest({
        fullName: "Test Sub",
        arrangementType: ["FINANCIAL", "IN_PERSON"],
        subType: ["ONLINE", "LIFESTYLE"],
        softLimits: ["limit-a"],
        hardLimits: ["limit-b"],
        preferences: ["pref-a", "pref-b"],
        tags: ["tag-a"],
      })
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          arrangementType: ["FINANCIAL", "IN_PERSON"],
          subType: ["ONLINE", "LIFESTYLE"],
          softLimits: ["limit-a"],
          hardLimits: ["limit-b"],
          preferences: ["pref-a", "pref-b"],
          tags: ["tag-a"],
        }),
      })
    );
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockCreate.mockRejectedValue(new Error("DB connection failed"));

    const res = await POST(createRequest({ fullName: "Test Sub" }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
