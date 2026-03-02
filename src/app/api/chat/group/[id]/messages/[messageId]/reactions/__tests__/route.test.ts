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
    },
    messageReaction: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
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

import { POST, DELETE } from "@/app/api/chat/group/[id]/messages/[messageId]/reactions/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isGroupMember } from "@/lib/group-chat-access";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockGroupFindUnique = vi.mocked(prisma.groupConversation.findUnique);
const mockMessageFindUnique = vi.mocked(prisma.chatMessage.findUnique);
const mockReactionFindUnique = vi.mocked(prisma.messageReaction.findUnique);
const mockReactionCreate = vi.mocked(prisma.messageReaction.create);
const mockReactionDelete = vi.mocked(prisma.messageReaction.delete);
const mockIsGroupMember = vi.mocked(isGroupMember);

const mockParams = Promise.resolve({ id: "group-1", messageId: "msg-1" });

function createPostRequest(body: Record<string, unknown>) {
  return new Request(
    "http://localhost:3000/api/chat/group/group-1/messages/msg-1/reactions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

function createDeleteRequest(body: Record<string, unknown>) {
  return new Request(
    "http://localhost:3000/api/chat/group/group-1/messages/msg-1/reactions",
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

describe("POST /api/chat/group/[id]/messages/[messageId]/reactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(createPostRequest({ emoji: "thumbsup" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 for missing group", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue(null);

    const res = await POST(createPostRequest({ emoji: "thumbsup" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Group not found");
  });

  it("returns 403 for non-member", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: false, role: null });

    const res = await POST(createPostRequest({ emoji: "thumbsup" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 400 for missing emoji", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });

    const res = await POST(createPostRequest({}), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Emoji is required");
  });

  it("returns 409 if already reacted", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      groupConversationId: "group-1",
    } as never);
    mockReactionFindUnique.mockResolvedValue({
      messageId: "msg-1",
      userId: "user-1",
      emoji: "thumbsup",
    } as never);

    const res = await POST(createPostRequest({ emoji: "thumbsup" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe("Already reacted");
  });

  it("creates reaction and publishes event", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      groupConversationId: "group-1",
    } as never);
    mockReactionFindUnique.mockResolvedValue(null);
    mockReactionCreate.mockResolvedValue({
      messageId: "msg-1",
      userId: "user-1",
      emoji: "thumbsup",
    } as never);

    const res = await POST(createPostRequest({ emoji: "thumbsup" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.emoji).toBe("thumbsup");
    expect(mockReactionCreate).toHaveBeenCalledWith({
      data: { messageId: "msg-1", userId: "user-1", emoji: "thumbsup" },
    });
    expect(mockChannelsGet).toHaveBeenCalledWith("group:group-1");
    expect(mockPublish).toHaveBeenCalledWith("reaction", {
      messageId: "msg-1",
      emoji: "thumbsup",
      userId: "user-1",
      action: "add",
    });
  });
});

describe("DELETE /api/chat/group/[id]/messages/[messageId]/reactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await DELETE(createDeleteRequest({ emoji: "thumbsup" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 for missing emoji", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });

    const res = await DELETE(createDeleteRequest({}), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Emoji is required");
  });

  it("returns 404 if reaction not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });
    mockReactionFindUnique.mockResolvedValue(null);

    const res = await DELETE(createDeleteRequest({ emoji: "thumbsup" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Reaction not found");
  });

  it("deletes reaction and publishes event", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });
    mockReactionFindUnique.mockResolvedValue({
      messageId: "msg-1",
      userId: "user-1",
      emoji: "thumbsup",
    } as never);
    mockReactionDelete.mockResolvedValue({} as never);

    const res = await DELETE(createDeleteRequest({ emoji: "thumbsup" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockReactionDelete).toHaveBeenCalledWith({
      where: {
        messageId_userId_emoji: {
          messageId: "msg-1",
          userId: "user-1",
          emoji: "thumbsup",
        },
      },
    });
    expect(mockChannelsGet).toHaveBeenCalledWith("group:group-1");
    expect(mockPublish).toHaveBeenCalledWith("reaction", {
      messageId: "msg-1",
      emoji: "thumbsup",
      userId: "user-1",
      action: "remove",
    });
  });
});
