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
    groupMember: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    groupConversation: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/group-chat-access", () => ({
  isGroupAdmin: vi.fn(),
}));

vi.mock("@/lib/chat-access", () => ({
  canDirectChat: vi.fn(),
}));

vi.mock("@/lib/ably", () => ({
  getAblyRest: vi.fn().mockReturnValue({
    channels: { get: mockChannelsGet },
  }),
}));

import { POST } from "@/app/api/chat/group/[id]/members/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isGroupAdmin } from "@/lib/group-chat-access";
import { canDirectChat } from "@/lib/chat-access";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockIsGroupAdmin = vi.mocked(isGroupAdmin);
const mockCanDirectChat = vi.mocked(canDirectChat);
const mockFindMany = vi.mocked(prisma.groupMember.findMany);
const mockCreateMany = vi.mocked(prisma.groupMember.createMany);

const mockParams = Promise.resolve({ id: "group-1" });

function createPostRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/chat/group/group-1/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat/group/[id]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(createPostRequest({ userIds: ["user-2"] }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when caller is not ADMIN", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockIsGroupAdmin.mockResolvedValue(false);

    const res = await POST(createPostRequest({ userIds: ["user-2"] }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Only admins can add members");
  });

  it("returns 400 when userIds is empty", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockIsGroupAdmin.mockResolvedValue(true);

    const res = await POST(createPostRequest({ userIds: [] }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("userIds array is required and must not be empty");
  });

  it("returns 403 when canDirectChat fails for a user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockIsGroupAdmin.mockResolvedValue(true);
    mockCanDirectChat.mockResolvedValue(false);

    const res = await POST(createPostRequest({ userIds: ["user-2"] }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Cannot add user user-2 to group");
  });

  it("skips users who are already members", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockIsGroupAdmin.mockResolvedValue(true);
    mockCanDirectChat.mockResolvedValue(true);
    // All requested users are already members
    mockFindMany.mockResolvedValueOnce([
      { userId: "user-2" },
    ] as never);

    const res = await POST(createPostRequest({ userIds: ["user-2"] }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.added).toEqual([]);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it("adds new members with MEMBER role and returns them", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockIsGroupAdmin.mockResolvedValue(true);
    mockCanDirectChat.mockResolvedValue(true);
    // No existing members with these IDs
    mockFindMany.mockResolvedValueOnce([] as never);
    mockCreateMany.mockResolvedValue({ count: 2 } as never);
    // findMany for addedMembers
    mockFindMany.mockResolvedValueOnce([
      {
        role: "MEMBER",
        user: { id: "user-2", name: "Bob", avatarUrl: null, role: "SUB" },
      },
      {
        role: "MEMBER",
        user: { id: "user-3", name: "Carol", avatarUrl: "/carol.jpg", role: "DOMME" },
      },
    ] as never);

    const res = await POST(
      createPostRequest({ userIds: ["user-2", "user-3"] }),
      { params: mockParams }
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.added).toHaveLength(2);
    expect(data.added[0]).toEqual({
      id: "user-2",
      name: "Bob",
      avatarUrl: null,
      role: "MEMBER",
      userRole: "SUB",
    });
    expect(data.added[1]).toEqual({
      id: "user-3",
      name: "Carol",
      avatarUrl: "/carol.jpg",
      role: "MEMBER",
      userRole: "DOMME",
    });
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        { groupConversationId: "group-1", userId: "user-2", role: "MEMBER" },
        { groupConversationId: "group-1", userId: "user-3", role: "MEMBER" },
      ],
    });
  });

  it("publishes member-added event to Ably", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockIsGroupAdmin.mockResolvedValue(true);
    mockCanDirectChat.mockResolvedValue(true);
    mockFindMany.mockResolvedValueOnce([] as never);
    mockCreateMany.mockResolvedValue({ count: 1 } as never);
    mockFindMany.mockResolvedValueOnce([
      {
        role: "MEMBER",
        user: { id: "user-2", name: "Bob", avatarUrl: null, role: "SUB" },
      },
    ] as never);

    await POST(createPostRequest({ userIds: ["user-2"] }), {
      params: mockParams,
    });

    expect(mockChannelsGet).toHaveBeenCalledWith("group:group-1");
    expect(mockPublish).toHaveBeenCalledWith("member-added", {
      members: [
        { id: "user-2", name: "Bob", avatarUrl: null, role: "MEMBER", userRole: "SUB" },
      ],
    });
  });
});
