import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    friendship: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { DELETE } from "@/app/api/friends/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindUnique = vi.mocked(prisma.friendship.findUnique);
const mockDelete = vi.mocked(prisma.friendship.delete);

const dummyRequest = new Request("http://localhost:3000/api/friends/f-1", {
  method: "DELETE",
});

describe("DELETE /api/friends/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await DELETE(dummyRequest, {
      params: Promise.resolve({ id: "f-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when friendship not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue(null);

    const res = await DELETE(dummyRequest, {
      params: Promise.resolve({ id: "f-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Friendship not found");
  });

  it("returns 404 when user is not involved in friendship", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-3" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "f-1",
      requesterId: "user-1",
      addresseeId: "user-2",
      status: "ACCEPTED",
    } as never);

    const res = await DELETE(dummyRequest, {
      params: Promise.resolve({ id: "f-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Friendship not found");
  });

  it("deletes the friendship when user is the requester", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "f-1",
      requesterId: "user-1",
      addresseeId: "user-2",
      status: "ACCEPTED",
    } as never);
    mockDelete.mockResolvedValue({} as never);

    const res = await DELETE(dummyRequest, {
      params: Promise.resolve({ id: "f-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "f-1" } });
  });

  it("deletes the friendship when user is the addressee", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "f-1",
      requesterId: "user-1",
      addresseeId: "user-2",
      status: "ACCEPTED",
    } as never);
    mockDelete.mockResolvedValue({} as never);

    const res = await DELETE(dummyRequest, {
      params: Promise.resolve({ id: "f-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
