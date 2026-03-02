import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    friendship: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

import { POST } from "@/app/api/friends/respond/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindUnique = vi.mocked(prisma.friendship.findUnique);
const mockUpdate = vi.mocked(prisma.friendship.update);
const mockCreateNotification = vi.mocked(createNotification);

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/friends/respond", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/friends/respond", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(
      createRequest({ friendshipId: "f-1", action: "accept" })
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when friendshipId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2", name: "Bob" },
      expires: "",
    } as never);

    const res = await POST(createRequest({ action: "accept" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("friendshipId is required");
  });

  it("returns 400 when action is invalid", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2", name: "Bob" },
      expires: "",
    } as never);

    const res = await POST(
      createRequest({ friendshipId: "f-1", action: "maybe" })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("action must be 'accept' or 'reject'");
  });

  it("returns 404 when friendship not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2", name: "Bob" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue(null);

    const res = await POST(
      createRequest({ friendshipId: "f-1", action: "accept" })
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Friend request not found");
  });

  it("returns 404 when user is not the addressee", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-3", name: "Charlie" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "f-1",
      requesterId: "user-1",
      addresseeId: "user-2",
      status: "PENDING",
    } as never);

    const res = await POST(
      createRequest({ friendshipId: "f-1", action: "accept" })
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Friend request not found");
  });

  it("returns 409 when friendship is not PENDING", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2", name: "Bob" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "f-1",
      requesterId: "user-1",
      addresseeId: "user-2",
      status: "ACCEPTED",
    } as never);

    const res = await POST(
      createRequest({ friendshipId: "f-1", action: "accept" })
    );
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe("Friend request already responded to");
  });

  it("accepts a friend request and creates notification", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2", name: "Bob" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "f-1",
      requesterId: "user-1",
      addresseeId: "user-2",
      status: "PENDING",
    } as never);
    mockUpdate.mockResolvedValue({} as never);
    mockCreateNotification.mockResolvedValue({} as never);

    const res = await POST(
      createRequest({ friendshipId: "f-1", action: "accept" })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ACCEPTED");

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "f-1" },
      data: { status: "ACCEPTED" },
    });

    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: "user-1",
      type: "FRIEND_ACCEPTED",
      message: "Bob accepted your friend request",
      linkUrl: "/users/user-2",
    });
  });

  it("rejects a friend request without creating notification", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2", name: "Bob" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "f-1",
      requesterId: "user-1",
      addresseeId: "user-2",
      status: "PENDING",
    } as never);
    mockUpdate.mockResolvedValue({} as never);

    const res = await POST(
      createRequest({ friendshipId: "f-1", action: "reject" })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("REJECTED");

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});
