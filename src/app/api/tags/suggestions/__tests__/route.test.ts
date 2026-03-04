import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findMany: vi.fn() },
    subProfile: { findMany: vi.fn() },
    mediaItem: { findMany: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { GET } from "@/app/api/tags/suggestions/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockTaskFindMany = vi.mocked(prisma.task.findMany);
const mockSubFindMany = vi.mocked(prisma.subProfile.findMany);
const mockMediaFindMany = vi.mocked(prisma.mediaItem.findMany);

describe("GET /api/tags/suggestions", () => {
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

  it("returns empty tags when no records exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    mockTaskFindMany.mockResolvedValue([]);
    mockSubFindMany.mockResolvedValue([]);
    mockMediaFindMany.mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ tags: [] });
  });

  it("aggregates tags from all three models", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    mockTaskFindMany.mockResolvedValue([
      { tags: ["urgent", "weekly"] },
    ] as never);
    mockSubFindMany.mockResolvedValue([
      { tags: ["obedient"], softLimits: ["roleplay"], hardLimits: ["bloodplay"] },
    ] as never);
    mockMediaFindMany.mockResolvedValue([
      { tags: ["photo", "session"] },
    ] as never);

    const res = await GET();
    const data = await res.json();

    expect(data.tags).toContain("urgent");
    expect(data.tags).toContain("weekly");
    expect(data.tags).toContain("obedient");
    expect(data.tags).toContain("roleplay");
    expect(data.tags).toContain("bloodplay");
    expect(data.tags).toContain("photo");
    expect(data.tags).toContain("session");
  });

  it("includes softLimits and hardLimits in suggestions", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    mockTaskFindMany.mockResolvedValue([]);
    mockSubFindMany.mockResolvedValue([
      { tags: [], softLimits: ["bondage", "wax"], hardLimits: ["breathplay"] },
    ] as never);
    mockMediaFindMany.mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();

    expect(data.tags).toEqual(["bondage", "breathplay", "wax"]);
  });

  it("deduplicates tags across models", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    mockTaskFindMany.mockResolvedValue([
      { tags: ["shared", "task-only"] },
    ] as never);
    mockSubFindMany.mockResolvedValue([
      { tags: ["shared", "sub-only"], softLimits: ["shared"], hardLimits: [] },
    ] as never);
    mockMediaFindMany.mockResolvedValue([
      { tags: ["shared", "media-only"] },
    ] as never);

    const res = await GET();
    const data = await res.json();

    const sharedCount = data.tags.filter((t: string) => t === "shared").length;
    expect(sharedCount).toBe(1);
    expect(data.tags).toContain("task-only");
    expect(data.tags).toContain("sub-only");
    expect(data.tags).toContain("media-only");
  });

  it("returns sorted results", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    mockTaskFindMany.mockResolvedValue([
      { tags: ["zebra", "alpha", "middle"] },
    ] as never);
    mockSubFindMany.mockResolvedValue([]);
    mockMediaFindMany.mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();

    expect(data.tags).toEqual(["alpha", "middle", "zebra"]);
  });

  it("scopes all queries to the authenticated user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    mockTaskFindMany.mockResolvedValue([]);
    mockSubFindMany.mockResolvedValue([]);
    mockMediaFindMany.mockResolvedValue([]);

    await GET();

    expect(mockTaskFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { tags: true },
    });
    expect(mockSubFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { tags: true, softLimits: true, hardLimits: true },
    });
    expect(mockMediaFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { tags: true },
    });
  });
});
