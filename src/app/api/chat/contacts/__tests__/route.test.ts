import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subProfile: {
      findMany: vi.fn(),
    },
    friendship: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/chat/contacts/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindMany = vi.mocked(prisma.subProfile.findMany);
const mockFriendshipFindMany = vi.mocked(prisma.friendship.findMany);

describe("GET /api/chat/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFriendshipFindMany.mockResolvedValue([] as never);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns linked subs for a Domme user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "domme-1" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([
      {
        userId: "domme-1",
        linkedUserId: "sub-1",
        user: { id: "domme-1", name: "Domme", avatarUrl: null },
        linkedUser: { id: "sub-1", name: "Sub Alice", avatarUrl: null },
      },
    ] as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0]).toEqual({
      id: "sub-1",
      name: "Sub Alice",
      avatarUrl: null,
    });
  });

  it("returns Domme for a Sub user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "sub-1" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([
      {
        userId: "domme-1",
        linkedUserId: "sub-1",
        user: { id: "domme-1", name: "Domme Boss", avatarUrl: "/avatar.jpg" },
        linkedUser: { id: "sub-1", name: "Sub Alice", avatarUrl: null },
      },
    ] as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0]).toEqual({
      id: "domme-1",
      name: "Domme Boss",
      avatarUrl: "/avatar.jpg",
    });
  });

  it("deduplicates contacts across multiple profiles", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "domme-1" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([
      {
        userId: "domme-1",
        linkedUserId: "sub-1",
        user: { id: "domme-1", name: "Domme", avatarUrl: null },
        linkedUser: { id: "sub-1", name: "Alice", avatarUrl: null },
      },
      {
        userId: "domme-1",
        linkedUserId: "sub-1",
        user: { id: "domme-1", name: "Domme", avatarUrl: null },
        linkedUser: { id: "sub-1", name: "Alice", avatarUrl: null },
      },
    ] as never);

    const res = await GET();
    const data = await res.json();

    expect(data).toHaveLength(1);
  });

  it("returns empty array when no linked profiles", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([] as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("returns multiple contacts for a Domme with several subs", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "domme-1" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([
      {
        userId: "domme-1",
        linkedUserId: "sub-1",
        user: { id: "domme-1", name: "Domme", avatarUrl: null },
        linkedUser: { id: "sub-1", name: "Alice", avatarUrl: null },
      },
      {
        userId: "domme-1",
        linkedUserId: "sub-2",
        user: { id: "domme-1", name: "Domme", avatarUrl: null },
        linkedUser: { id: "sub-2", name: "Bob", avatarUrl: null },
      },
    ] as never);

    const res = await GET();
    const data = await res.json();

    expect(data).toHaveLength(2);
    expect(data.map((c: { name: string }) => c.name)).toEqual([
      "Alice",
      "Bob",
    ]);
  });

  it("returns accepted friends as contacts", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([] as never);
    mockFriendshipFindMany.mockResolvedValue([
      {
        requesterId: "user-1",
        addresseeId: "friend-1",
        requester: { id: "user-1", name: "Me", avatarUrl: null },
        addressee: { id: "friend-1", name: "Friend One", avatarUrl: "/f1.jpg" },
      },
    ] as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0]).toEqual({
      id: "friend-1",
      name: "Friend One",
      avatarUrl: "/f1.jpg",
    });
  });

  it("returns friend when current user is addressee", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([] as never);
    mockFriendshipFindMany.mockResolvedValue([
      {
        requesterId: "friend-2",
        addresseeId: "user-1",
        requester: { id: "friend-2", name: "Friend Two", avatarUrl: null },
        addressee: { id: "user-1", name: "Me", avatarUrl: null },
      },
    ] as never);

    const res = await GET();
    const data = await res.json();

    expect(data).toHaveLength(1);
    expect(data[0]).toEqual({
      id: "friend-2",
      name: "Friend Two",
      avatarUrl: null,
    });
  });

  it("combines linked profiles and friends without duplicates", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "domme-1" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([
      {
        userId: "domme-1",
        linkedUserId: "sub-1",
        user: { id: "domme-1", name: "Domme", avatarUrl: null },
        linkedUser: { id: "sub-1", name: "Alice", avatarUrl: null },
      },
    ] as never);

    mockFriendshipFindMany.mockResolvedValue([
      {
        requesterId: "domme-1",
        addresseeId: "sub-1",
        requester: { id: "domme-1", name: "Domme", avatarUrl: null },
        addressee: { id: "sub-1", name: "Alice", avatarUrl: null },
      },
      {
        requesterId: "domme-1",
        addresseeId: "friend-1",
        requester: { id: "domme-1", name: "Domme", avatarUrl: null },
        addressee: { id: "friend-1", name: "Friend", avatarUrl: null },
      },
    ] as never);

    const res = await GET();
    const data = await res.json();

    expect(data).toHaveLength(2);
    const ids = data.map((c: { id: string }) => c.id);
    expect(ids).toContain("sub-1");
    expect(ids).toContain("friend-1");
  });

  it("returns multiple friends as contacts", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([] as never);
    mockFriendshipFindMany.mockResolvedValue([
      {
        requesterId: "user-1",
        addresseeId: "friend-1",
        requester: { id: "user-1", name: "Me", avatarUrl: null },
        addressee: { id: "friend-1", name: "Friend A", avatarUrl: null },
      },
      {
        requesterId: "friend-2",
        addresseeId: "user-1",
        requester: { id: "friend-2", name: "Friend B", avatarUrl: null },
        addressee: { id: "user-1", name: "Me", avatarUrl: null },
      },
    ] as never);

    const res = await GET();
    const data = await res.json();

    expect(data).toHaveLength(2);
    expect(data.map((c: { name: string }) => c.name)).toEqual(
      expect.arrayContaining(["Friend A", "Friend B"])
    );
  });

  it("queries friendships with correct filter", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([] as never);
    mockFriendshipFindMany.mockResolvedValue([] as never);

    await GET();

    expect(mockFriendshipFindMany).toHaveBeenCalledWith({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: "user-1" }, { addresseeId: "user-1" }],
      },
      select: {
        requesterId: true,
        addresseeId: true,
        requester: { select: { id: true, name: true, avatarUrl: true } },
        addressee: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  });
});
