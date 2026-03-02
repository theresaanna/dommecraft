import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    friendship: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

import { POST } from "@/app/api/friends/request/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindFirst = vi.mocked(prisma.friendship.findFirst);
const mockCreate = vi.mocked(prisma.friendship.create);
const mockCreateNotification = vi.mocked(createNotification);

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/friends/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/friends/request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(createRequest({ addresseeId: "user-2" }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when addresseeId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);

    const res = await POST(createRequest({}));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("addresseeId is required");
  });

  it("returns 400 when trying to friend yourself", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);

    const res = await POST(createRequest({ addresseeId: "user-1" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Cannot send a friend request to yourself");
  });

  it("returns 409 when friendship already exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockFindFirst.mockResolvedValue({ id: "existing" } as never);

    const res = await POST(createRequest({ addresseeId: "user-2" }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe("Friend request already exists");
  });

  it("creates friendship and notification on success", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "friend-1",
      requesterId: "user-1",
      addresseeId: "user-2",
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockCreateNotification.mockResolvedValue({} as never);

    const res = await POST(createRequest({ addresseeId: "user-2" }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("friend-1");
    expect(data.status).toBe("PENDING");

    expect(mockCreate).toHaveBeenCalledWith({
      data: { requesterId: "user-1", addresseeId: "user-2" },
    });

    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: "user-2",
      type: "FRIEND_REQUEST",
      message: "Alice sent you a friend request",
      linkUrl: "/users/user-1",
    });
  });
});
