import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { GET, PATCH } from "@/app/api/notifications/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindMany = vi.mocked(prisma.notification.findMany);
const mockUpdateMany = vi.mocked(prisma.notification.updateMany);

function createPatchRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET(
      new Request("http://localhost:3000/api/notifications")
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns unread notifications by default", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([
      {
        id: "notif-1",
        type: "TASK_ASSIGNED",
        message: "New task",
        isRead: false,
      },
    ] as never);

    const res = await GET(
      new Request("http://localhost:3000/api/notifications")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", isRead: false },
      })
    );
  });

  it("returns all notifications when all=true", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([] as never);

    const res = await GET(
      new Request("http://localhost:3000/api/notifications?all=true")
    );

    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
      })
    );
  });

  it("orders by createdAt desc and limits to 50", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([] as never);

    await GET(new Request("http://localhost:3000/api/notifications"));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    );
  });
});

describe("PATCH /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await PATCH(createPatchRequest({ ids: ["id-1"] }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when ids is empty and markAll is not set", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    const res = await PATCH(createPatchRequest({ ids: [] }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("ids array is required");
  });

  it("returns 400 when ids is not an array", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    const res = await PATCH(createPatchRequest({ ids: "not-array" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("ids array is required");
  });

  it("marks specific notifications as read by ids", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockUpdateMany.mockResolvedValue({ count: 2 } as never);

    const res = await PATCH(
      createPatchRequest({ ids: ["notif-1", "notif-2"] })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.updated).toBe(2);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["notif-1", "notif-2"] },
        userId: "user-1",
      },
      data: { isRead: true },
    });
  });

  it("marks all notifications as read with markAll flag", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockUpdateMany.mockResolvedValue({ count: 5 } as never);

    const res = await PATCH(createPatchRequest({ markAll: true }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.updated).toBe(5);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        isRead: false,
      },
      data: { isRead: true },
    });
  });

  it("scopes markAll to the authenticated user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2" },
      expires: "",
    } as never);
    mockUpdateMany.mockResolvedValue({ count: 0 } as never);

    await PATCH(createPatchRequest({ markAll: true }));

    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-2" }),
      })
    );
  });
});
