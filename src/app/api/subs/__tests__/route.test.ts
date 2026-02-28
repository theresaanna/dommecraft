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

  it("returns 403 when user is not a DOMME", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "SUB" },
      expires: "",
    } as never);

    const res = await GET(new Request("http://localhost:3000/api/subs"));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
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

  it("sorts by expendableIncome field", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request(
        "http://localhost:3000/api/subs?sort=expendableIncome&order=asc"
      )
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { expendableIncome: "asc" },
      })
    );
  });

  it("falls back to createdAt for invalid sort field", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request("http://localhost:3000/api/subs?sort=invalidField")
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("defaults sort order to desc for invalid order", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request("http://localhost:3000/api/subs?order=invalid")
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("filters by tags param", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request(
        "http://localhost:3000/api/subs?tags=loyal&tags=obedient"
      )
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tags: { hasSome: ["loyal", "obedient"] },
        }),
      })
    );
  });

  it("filters by financial_min param (requires non-null expendableIncome)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request("http://localhost:3000/api/subs?financial_min=100")
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { expendableIncome: { not: null } },
          ]),
        }),
      })
    );
  });

  it("filters by financial_max param (requires non-null expendableIncome)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request("http://localhost:3000/api/subs?financial_max=500")
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { expendableIncome: { not: null } },
          ]),
        }),
      })
    );
  });

  it("filters by both financial_min and financial_max", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request(
        "http://localhost:3000/api/subs?financial_min=100&financial_max=500"
      )
    );

    const call = mockFindMany.mock.calls[0][0];
    expect(call?.where?.AND).toBeDefined();
    expect(Array.isArray(call?.where?.AND)).toBe(true);
  });

  it("does not add AND clause when no financial params", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(new Request("http://localhost:3000/api/subs"));

    const call = mockFindMany.mock.calls[0][0];
    expect(call?.where?.AND).toBeUndefined();
  });

  it("combines multiple filter types", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request(
        "http://localhost:3000/api/subs?q=test&sub_type=Finsub&arrangement_type=Financial&tags=loyal&financial_min=100"
      )
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { fullName: { contains: "test", mode: "insensitive" } },
            { contactInfo: { contains: "test", mode: "insensitive" } },
            { privateNotes: { contains: "test", mode: "insensitive" } },
          ],
          subType: { hasSome: ["Finsub"] },
          arrangementType: { hasSome: ["Financial"] },
          tags: { hasSome: ["loyal"] },
          AND: expect.arrayContaining([
            { expendableIncome: { not: null } },
          ]),
        }),
      })
    );
  });

  it("filters by multiple sub_type values", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request(
        "http://localhost:3000/api/subs?sub_type=Finsub&sub_type=Brat"
      )
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          subType: { hasSome: ["Finsub", "Brat"] },
        }),
      })
    );
  });

  it("filters by multiple arrangement_type values", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request(
        "http://localhost:3000/api/subs?arrangement_type=Online&arrangement_type=Financial"
      )
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          arrangementType: { hasSome: ["Online", "Financial"] },
        }),
      })
    );
  });

  it("includes expendableIncome in select", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(new Request("http://localhost:3000/api/subs"));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          expendableIncome: true,
        }),
      })
    );
  });

  it("includes archived subs when include_archived=true", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request("http://localhost:3000/api/subs?include_archived=true")
    );

    const call = mockFindMany.mock.calls[0][0];
    expect(call?.where?.isArchived).toBeUndefined();
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

  it("returns 403 when user is not a DOMME", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "SUB" },
      expires: "",
    } as never);

    const res = await POST(createRequest({ fullName: "Test Sub" }));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
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
