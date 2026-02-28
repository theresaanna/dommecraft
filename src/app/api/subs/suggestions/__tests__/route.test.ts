import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subProfile: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { GET } from "@/app/api/subs/suggestions/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindMany = vi.mocked(prisma.subProfile.findMany);

describe("GET /api/subs/suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns empty arrays when no subs exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      tags: [],
      softLimits: [],
      hardLimits: [],
    });
  });

  it("aggregates unique values from all subs", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([
      {
        tags: ["obedient", "loyal"],
        softLimits: ["roleplay", "bondage"],
        hardLimits: ["bloodplay"],
      },
      {
        tags: ["obedient", "new"],
        softLimits: ["roleplay", "wax"],
        hardLimits: ["bloodplay", "breathplay"],
      },
    ] as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.tags).toEqual(["loyal", "new", "obedient"]);
    expect(data.softLimits).toEqual(["bondage", "roleplay", "wax"]);
    expect(data.hardLimits).toEqual(["bloodplay", "breathplay"]);
  });

  it("returns sorted values", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([
      {
        tags: ["zebra", "alpha", "middle"],
        softLimits: [],
        hardLimits: [],
      },
    ] as never);

    const res = await GET();
    const data = await res.json();

    expect(data.tags).toEqual(["alpha", "middle", "zebra"]);
  });

  it("fetches from all subs globally (not user-scoped)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([]);

    await GET();

    expect(mockFindMany).toHaveBeenCalledWith({
      select: {
        tags: true,
        softLimits: true,
        hardLimits: true,
      },
    });
  });
});
