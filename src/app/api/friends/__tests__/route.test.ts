import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    friendship: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/friends/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindMany = vi.mocked(prisma.friendship.findMany);

describe("GET /api/friends", () => {
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

  it("returns accepted friends for current user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([
      {
        id: "f-1",
        requesterId: "user-1",
        addresseeId: "user-2",
        status: "ACCEPTED",
        requester: { id: "user-1", name: "Alice", avatarUrl: null },
        addressee: { id: "user-2", name: "Bob", avatarUrl: null },
        updatedAt: new Date("2025-06-01"),
      },
      {
        id: "f-2",
        requesterId: "user-3",
        addresseeId: "user-1",
        status: "ACCEPTED",
        requester: { id: "user-3", name: "Charlie", avatarUrl: null },
        addressee: { id: "user-1", name: "Alice", avatarUrl: null },
        updatedAt: new Date("2025-06-02"),
      },
    ] as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(2);
    // First friend: user-1 is requester, so other is addressee (Bob)
    expect(data[0].user.name).toBe("Bob");
    expect(data[0].friendshipId).toBe("f-1");
    // Second friend: user-3 is requester, so other is requester (Charlie)
    expect(data[1].user.name).toBe("Charlie");
    expect(data[1].friendshipId).toBe("f-2");
  });

  it("returns empty array when user has no friends", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });
});
