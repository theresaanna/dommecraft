import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subProfile: {
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

describe("GET /api/chat/contacts", () => {
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
});
