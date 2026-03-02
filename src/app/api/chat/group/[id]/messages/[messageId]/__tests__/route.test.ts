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
    },
    chatMessage: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/group-chat-access", () => ({
  isGroupMember: vi.fn(),
}));

vi.mock("@/lib/ably", () => ({
  getAblyRest: vi.fn().mockReturnValue({
    channels: { get: mockChannelsGet },
  }),
}));

import { PUT } from "@/app/api/chat/group/[id]/messages/[messageId]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isGroupMember } from "@/lib/group-chat-access";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockGroupFindUnique = vi.mocked(prisma.groupConversation.findUnique);
const mockMessageFindUnique = vi.mocked(prisma.chatMessage.findUnique);
const mockMessageUpdate = vi.mocked(prisma.chatMessage.update);
const mockIsGroupMember = vi.mocked(isGroupMember);

const mockParams = Promise.resolve({ id: "group-1", messageId: "msg-1" });

function createPutRequest(body: Record<string, unknown>) {
  return new Request(
    "http://localhost:3000/api/chat/group/group-1/messages/msg-1",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

describe("PUT /api/chat/group/[id]/messages/[messageId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await PUT(createPutRequest({ content: "edited" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when group does not exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue(null);

    const res = await PUT(createPutRequest({ content: "edited" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Group not found");
  });

  it("returns 403 when user is not a member", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: false, role: null });

    const res = await PUT(createPutRequest({ content: "edited" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 404 when message not found or wrong group", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });
    mockMessageFindUnique.mockResolvedValue(null);

    const res = await PUT(createPutRequest({ content: "edited" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Message not found");
  });

  it("returns 404 when message belongs to different group", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      groupConversationId: "group-other",
      senderId: "user-1",
    } as never);

    const res = await PUT(createPutRequest({ content: "edited" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Message not found");
  });

  it("returns 403 when not message sender", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      groupConversationId: "group-1",
      senderId: "user-2",
    } as never);

    const res = await PUT(createPutRequest({ content: "edited" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("You can only edit your own messages");
  });

  it("returns 400 for empty content", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      groupConversationId: "group-1",
      senderId: "user-1",
    } as never);

    const res = await PUT(createPutRequest({ content: "   " }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Message content is required");
  });

  it("updates message and publishes edit event", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      groupConversationId: "group-1",
      senderId: "user-1",
    } as never);

    const editedAt = new Date("2025-01-01T13:00:00Z");
    mockMessageUpdate.mockResolvedValue({
      id: "msg-1",
      senderId: "user-1",
      content: "edited message",
      mediaUrl: null,
      mediaMimeType: null,
      mediaFileSize: null,
      editedAt,
      createdAt: new Date("2025-01-01T12:00:00Z"),
      reactions: [],
    } as never);

    const res = await PUT(createPutRequest({ content: "edited message" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.content).toBe("edited message");
    expect(data.editedAt).toBe("2025-01-01T13:00:00.000Z");

    expect(mockMessageUpdate).toHaveBeenCalledWith({
      where: { id: "msg-1" },
      data: { content: "edited message", editedAt: expect.any(Date) },
      select: {
        id: true,
        senderId: true,
        content: true,
        mediaUrl: true,
        mediaMimeType: true,
        mediaFileSize: true,
        editedAt: true,
        createdAt: true,
        reactions: { select: { emoji: true, userId: true } },
      },
    });

    expect(mockChannelsGet).toHaveBeenCalledWith("group:group-1");
    expect(mockPublish).toHaveBeenCalledWith(
      "edit",
      expect.objectContaining({
        id: "msg-1",
        content: "edited message",
        editedAt: "2025-01-01T13:00:00.000Z",
      })
    );
  });
});
