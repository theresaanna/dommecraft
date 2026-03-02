import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPublish, mockChannelsGet } = vi.hoisted(() => {
  const mockPublish = vi.fn().mockResolvedValue(undefined);
  const mockChannelsGet = vi.fn().mockReturnValue({ publish: mockPublish });
  return { mockPublish, mockChannelsGet };
});

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    groupConversation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    groupMember: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/group-chat-access", () => ({
  isGroupMember: vi.fn(),
  isGroupAdmin: vi.fn(),
}));

vi.mock("@/lib/ably", () => ({
  getAblyRest: vi.fn().mockReturnValue({
    channels: { get: mockChannelsGet },
  }),
}));

import { GET, PUT } from "@/app/api/chat/group/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isGroupMember, isGroupAdmin } from "@/lib/group-chat-access";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindUnique = vi.mocked(prisma.groupConversation.findUnique);
const mockUpdate = vi.mocked(prisma.groupConversation.update);
const mockIsGroupMember = vi.mocked(isGroupMember);
const mockIsGroupAdmin = vi.mocked(isGroupAdmin);

function createPutRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/chat/group/group-1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockParams = Promise.resolve({ id: "group-1" });

describe("GET /api/chat/group/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost:3000"), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when group does not exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost:3000"), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Group not found");
  });

  it("returns 403 when user is not a member", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-99" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "group-1",
      name: "Test",
      createdById: "user-1",
      members: [],
    } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: false, role: null });

    const res = await GET(new Request("http://localhost:3000"), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns group details with members", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "group-1",
      name: "Test Group",
      createdById: "user-1",
      members: [
        {
          role: "ADMIN",
          joinedAt: new Date("2025-01-01T10:00:00Z"),
          user: { id: "user-1", name: "Alice", avatarUrl: null },
        },
        {
          role: "MEMBER",
          joinedAt: new Date("2025-01-01T10:01:00Z"),
          user: { id: "user-2", name: "Bob", avatarUrl: "/bob.jpg" },
        },
      ],
    } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "ADMIN" });

    const res = await GET(new Request("http://localhost:3000"), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("group-1");
    expect(data.name).toBe("Test Group");
    expect(data.createdById).toBe("user-1");
    expect(data.members).toHaveLength(2);
    expect(data.members[0].role).toBe("ADMIN");
    expect(data.members[1].name).toBe("Bob");
  });
});

describe("PUT /api/chat/group/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await PUT(createPutRequest({ name: "New Name" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when user is not an admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2" },
      expires: "",
    } as never);
    mockIsGroupAdmin.mockResolvedValue(false);

    const res = await PUT(createPutRequest({ name: "New Name" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Only admins can update the group");
  });

  it("returns 400 when name is empty", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockIsGroupAdmin.mockResolvedValue(true);

    const res = await PUT(createPutRequest({ name: "  " }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Group name is required");
  });

  it("updates group name and publishes Ably event", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockIsGroupAdmin.mockResolvedValue(true);
    mockUpdate.mockResolvedValue({
      id: "group-1",
      name: "Renamed Group",
      updatedAt: new Date("2025-01-02T12:00:00Z"),
    } as never);

    const res = await PUT(createPutRequest({ name: "Renamed Group" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe("Renamed Group");
    expect(mockPublish).toHaveBeenCalledWith("group-update", {
      name: "Renamed Group",
    });
  });

  it("still returns 200 if Ably publish fails", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockIsGroupAdmin.mockResolvedValue(true);
    mockUpdate.mockResolvedValue({
      id: "group-1",
      name: "Renamed",
      updatedAt: new Date("2025-01-02T12:00:00Z"),
    } as never);
    mockPublish.mockRejectedValue(new Error("Ably error"));

    const res = await PUT(createPutRequest({ name: "Renamed" }), {
      params: mockParams,
    });

    expect(res.status).toBe(200);
  });
});
