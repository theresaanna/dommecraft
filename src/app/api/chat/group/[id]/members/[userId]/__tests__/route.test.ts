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
      delete: vi.fn(),
      update: vi.fn(),
    },
    groupConversation: {
      delete: vi.fn(),
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

import { DELETE, PATCH } from "@/app/api/chat/group/[id]/members/[userId]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isGroupMember, isGroupAdmin } from "@/lib/group-chat-access";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockIsGroupMember = vi.mocked(isGroupMember);
const mockIsGroupAdmin = vi.mocked(isGroupAdmin);
const mockMemberFindMany = vi.mocked(prisma.groupMember.findMany);
const mockMemberDelete = vi.mocked(prisma.groupMember.delete);
const mockMemberUpdate = vi.mocked(prisma.groupMember.update);
const mockGroupDelete = vi.mocked(prisma.groupConversation.delete);

const mockParams = Promise.resolve({ id: "group-1", userId: "user-2" });

function createDeleteRequest() {
  return new Request(
    "http://localhost:3000/api/chat/group/group-1/members/user-2",
    { method: "DELETE" }
  );
}

function createPatchRequest(body: Record<string, unknown>) {
  return new Request(
    "http://localhost:3000/api/chat/group/group-1/members/user-2",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

describe("DELETE /api/chat/group/[id]/members/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await DELETE(createDeleteRequest(), { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when caller is not a member", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: false, role: null });

    const res = await DELETE(createDeleteRequest(), { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("allows member to leave (remove self)", async () => {
    // When user-1 removes themselves (params userId matches session userId)
    const selfParams = Promise.resolve({ id: "group-1", userId: "user-1" });
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });
    mockMemberFindMany.mockResolvedValue([
      { userId: "user-1", role: "MEMBER" },
      { userId: "user-2", role: "ADMIN" },
    ] as never);
    mockMemberDelete.mockResolvedValue({} as never);

    const res = await DELETE(createDeleteRequest(), { params: selfParams });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockMemberDelete).toHaveBeenCalledWith({
      where: {
        groupConversationId_userId: {
          groupConversationId: "group-1",
          userId: "user-1",
        },
      },
    });
  });

  it("returns 400 when last ADMIN tries to leave with other members", async () => {
    const selfParams = Promise.resolve({ id: "group-1", userId: "user-1" });
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "ADMIN" });
    mockMemberFindMany.mockResolvedValue([
      { userId: "user-1", role: "ADMIN" },
      { userId: "user-2", role: "MEMBER" },
    ] as never);

    const res = await DELETE(createDeleteRequest(), { params: selfParams });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Transfer admin role before leaving");
  });

  it("deletes group when last member leaves", async () => {
    const selfParams = Promise.resolve({ id: "group-1", userId: "user-1" });
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "ADMIN" });
    mockMemberFindMany.mockResolvedValue([
      { userId: "user-1", role: "ADMIN" },
    ] as never);
    mockGroupDelete.mockResolvedValue({} as never);

    const res = await DELETE(createDeleteRequest(), { params: selfParams });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGroupDelete).toHaveBeenCalledWith({
      where: { id: "group-1" },
    });
    expect(mockMemberDelete).not.toHaveBeenCalled();
  });

  it("returns 403 when non-ADMIN tries to remove another member", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });
    mockIsGroupAdmin.mockResolvedValue(false);

    const res = await DELETE(createDeleteRequest(), { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Only admins can remove members");
  });

  it("ADMIN can remove another member", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "ADMIN" });
    mockIsGroupAdmin.mockResolvedValue(true);
    mockMemberDelete.mockResolvedValue({} as never);

    const res = await DELETE(createDeleteRequest(), { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockMemberDelete).toHaveBeenCalledWith({
      where: {
        groupConversationId_userId: {
          groupConversationId: "group-1",
          userId: "user-2",
        },
      },
    });
    expect(mockChannelsGet).toHaveBeenCalledWith("group:group-1");
    expect(mockPublish).toHaveBeenCalledWith("member-removed", {
      userId: "user-2",
      removedBy: "user-1",
    });
  });
});

describe("PATCH /api/chat/group/[id]/members/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await PATCH(createPatchRequest({ role: "ADMIN" }), {
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

    const res = await PATCH(createPatchRequest({ role: "ADMIN" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Only admins can change member roles");
  });

  it("returns 400 for invalid role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockIsGroupAdmin.mockResolvedValue(true);

    const res = await PATCH(createPatchRequest({ role: "SUPERADMIN" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Role must be ADMIN or MEMBER");
  });

  it("returns 400 when trying to demote last ADMIN", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockIsGroupAdmin.mockResolvedValue(true);
    mockMemberFindMany.mockResolvedValue([
      { userId: "user-2" },
    ] as never);

    const res = await PATCH(createPatchRequest({ role: "MEMBER" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Cannot demote the last admin");
  });

  it("updates member role successfully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockIsGroupAdmin.mockResolvedValue(true);
    mockMemberUpdate.mockResolvedValue({
      role: "ADMIN",
      user: { id: "user-2", name: "Bob", avatarUrl: "/bob.jpg" },
    } as never);

    const res = await PATCH(createPatchRequest({ role: "ADMIN" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      id: "user-2",
      name: "Bob",
      avatarUrl: "/bob.jpg",
      role: "ADMIN",
    });
    expect(mockMemberUpdate).toHaveBeenCalledWith({
      where: {
        groupConversationId_userId: {
          groupConversationId: "group-1",
          userId: "user-2",
        },
      },
      data: { role: "ADMIN" },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    expect(mockChannelsGet).toHaveBeenCalledWith("group:group-1");
    expect(mockPublish).toHaveBeenCalledWith("member-updated", {
      id: "user-2",
      name: "Bob",
      avatarUrl: "/bob.jpg",
      role: "ADMIN",
    });
  });
});
