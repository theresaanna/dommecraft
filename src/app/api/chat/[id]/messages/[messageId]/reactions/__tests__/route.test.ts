import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findUnique: vi.fn(),
    },
    chatMessage: {
      findUnique: vi.fn(),
    },
    messageReaction: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const { mockPublish, mockChannelsGet } = vi.hoisted(() => {
  const mockPublish = vi.fn().mockResolvedValue(undefined);
  const mockChannelsGet = vi.fn().mockReturnValue({ publish: mockPublish });
  return { mockPublish, mockChannelsGet };
});

vi.mock("@/lib/ably", () => ({
  getAblyRest: vi.fn().mockReturnValue({
    channels: { get: mockChannelsGet },
  }),
}));

import { POST, DELETE } from "@/app/api/chat/[id]/messages/[messageId]/reactions/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockConversationFindUnique = vi.mocked(prisma.conversation.findUnique);
const mockMessageFindUnique = vi.mocked(prisma.chatMessage.findUnique);
const mockReactionFindUnique = vi.mocked(prisma.messageReaction.findUnique);
const mockReactionCreate = vi.mocked(prisma.messageReaction.create);
const mockReactionDelete = vi.mocked(prisma.messageReaction.delete);
const mockReactionFindMany = vi.mocked(prisma.messageReaction.findMany);

const params = Promise.resolve({ id: "conv-1", messageId: "msg-1" });

function createPostRequest(body: Record<string, unknown>) {
  return new Request(
    "http://localhost:3000/api/chat/conv-1/messages/msg-1/reactions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

function createDeleteRequest(body: Record<string, unknown>) {
  return new Request(
    "http://localhost:3000/api/chat/conv-1/messages/msg-1/reactions",
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

function authenticateAsParticipant(userId = "user-1") {
  mockAuth.mockResolvedValue({
    user: { id: userId },
    expires: "",
  } as never);
  mockConversationFindUnique.mockResolvedValue({
    participant1Id: "user-1",
    participant2Id: "user-2",
  } as never);
}

describe("POST /api/chat/[id]/messages/[messageId]/reactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(createPostRequest({ emoji: "👍" }), { params });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when conversation does not exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue(null);

    const res = await POST(createPostRequest({ emoji: "👍" }), { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Conversation not found");
  });

  it("returns 403 when user is not a participant", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-3" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);

    const res = await POST(createPostRequest({ emoji: "👍" }), { params });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 400 when emoji is missing", async () => {
    authenticateAsParticipant();

    const res = await POST(createPostRequest({}), { params });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Emoji is required");
  });

  it("returns 400 when emoji is not a string", async () => {
    authenticateAsParticipant();

    const res = await POST(createPostRequest({ emoji: 123 }), { params });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Emoji is required");
  });

  it("returns 404 when message does not exist", async () => {
    authenticateAsParticipant();
    mockMessageFindUnique.mockResolvedValue(null);

    const res = await POST(createPostRequest({ emoji: "👍" }), { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Message not found");
  });

  it("returns 404 when message belongs to a different conversation", async () => {
    authenticateAsParticipant();
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-other",
    } as never);

    const res = await POST(createPostRequest({ emoji: "👍" }), { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Message not found");
  });

  it("returns 409 when user already reacted with the same emoji", async () => {
    authenticateAsParticipant();
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
    } as never);
    mockReactionFindUnique.mockResolvedValue({
      id: "reaction-1",
      messageId: "msg-1",
      userId: "user-1",
      emoji: "👍",
    } as never);

    const res = await POST(createPostRequest({ emoji: "👍" }), { params });
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe("Already reacted");
  });

  it("creates a reaction and returns 201", async () => {
    authenticateAsParticipant();
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
    } as never);
    mockReactionFindUnique.mockResolvedValue(null);

    const createdReaction = {
      id: "reaction-1",
      messageId: "msg-1",
      userId: "user-1",
      emoji: "👍",
      createdAt: new Date("2025-01-01T12:00:00Z"),
    };
    mockReactionCreate.mockResolvedValue(createdReaction as never);
    mockReactionFindMany.mockResolvedValue([
      { emoji: "👍", userId: "user-1" },
    ] as never);

    const res = await POST(createPostRequest({ emoji: "👍" }), { params });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("reaction-1");
    expect(data.emoji).toBe("👍");
  });

  it("publishes reaction event to Ably channel", async () => {
    authenticateAsParticipant();
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
    } as never);
    mockReactionFindUnique.mockResolvedValue(null);

    const createdReaction = {
      id: "reaction-1",
      messageId: "msg-1",
      userId: "user-1",
      emoji: "👍",
      createdAt: new Date("2025-01-01T12:00:00Z"),
    };
    mockReactionCreate.mockResolvedValue(createdReaction as never);
    mockReactionFindMany.mockResolvedValue([
      { emoji: "👍", userId: "user-1" },
    ] as never);

    await POST(createPostRequest({ emoji: "👍" }), { params });

    expect(mockChannelsGet).toHaveBeenCalledWith("chat:conv-1");
    expect(mockPublish).toHaveBeenCalledWith("reaction", {
      messageId: "msg-1",
      emoji: "👍",
      userId: "user-1",
      action: "add",
    });
  });

  it("still returns 201 if Ably publish fails", async () => {
    authenticateAsParticipant();
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
    } as never);
    mockReactionFindUnique.mockResolvedValue(null);

    const createdReaction = {
      id: "reaction-1",
      messageId: "msg-1",
      userId: "user-1",
      emoji: "👍",
      createdAt: new Date("2025-01-01T12:00:00Z"),
    };
    mockReactionCreate.mockResolvedValue(createdReaction as never);
    mockReactionFindMany.mockResolvedValue([
      { emoji: "👍", userId: "user-1" },
    ] as never);
    mockPublish.mockRejectedValueOnce(new Error("Ably down"));

    const res = await POST(createPostRequest({ emoji: "👍" }), { params });

    expect(res.status).toBe(201);
  });

  it("allows multiple different emoji reactions from the same user", async () => {
    authenticateAsParticipant();
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
    } as never);
    mockReactionFindUnique.mockResolvedValue(null);

    const createdReaction = {
      id: "reaction-2",
      messageId: "msg-1",
      userId: "user-1",
      emoji: "❤️",
      createdAt: new Date("2025-01-01T12:01:00Z"),
    };
    mockReactionCreate.mockResolvedValue(createdReaction as never);
    mockReactionFindMany.mockResolvedValue([
      { emoji: "👍", userId: "user-1" },
      { emoji: "❤️", userId: "user-1" },
    ] as never);

    const res = await POST(createPostRequest({ emoji: "❤️" }), { params });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.emoji).toBe("❤️");
  });
});

describe("DELETE /api/chat/[id]/messages/[messageId]/reactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await DELETE(createDeleteRequest({ emoji: "👍" }), { params });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when conversation does not exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue(null);

    const res = await DELETE(createDeleteRequest({ emoji: "👍" }), { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Conversation not found");
  });

  it("returns 403 when user is not a participant", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-3" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);

    const res = await DELETE(createDeleteRequest({ emoji: "👍" }), { params });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 400 when emoji is missing", async () => {
    authenticateAsParticipant();

    const res = await DELETE(createDeleteRequest({}), { params });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Emoji is required");
  });

  it("returns 404 when reaction does not exist", async () => {
    authenticateAsParticipant();
    mockReactionFindUnique.mockResolvedValue(null);

    const res = await DELETE(createDeleteRequest({ emoji: "👍" }), { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Reaction not found");
  });

  it("deletes the reaction and returns 200", async () => {
    authenticateAsParticipant();
    mockReactionFindUnique.mockResolvedValue({
      id: "reaction-1",
      messageId: "msg-1",
      userId: "user-1",
      emoji: "👍",
    } as never);
    mockReactionDelete.mockResolvedValue({} as never);

    const res = await DELETE(createDeleteRequest({ emoji: "👍" }), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("deletes using the correct compound key", async () => {
    authenticateAsParticipant();
    mockReactionFindUnique.mockResolvedValue({
      id: "reaction-1",
      messageId: "msg-1",
      userId: "user-1",
      emoji: "👍",
    } as never);
    mockReactionDelete.mockResolvedValue({} as never);

    await DELETE(createDeleteRequest({ emoji: "👍" }), { params });

    expect(mockReactionDelete).toHaveBeenCalledWith({
      where: {
        messageId_userId_emoji: {
          messageId: "msg-1",
          userId: "user-1",
          emoji: "👍",
        },
      },
    });
  });

  it("publishes reaction removal event to Ably channel", async () => {
    authenticateAsParticipant();
    mockReactionFindUnique.mockResolvedValue({
      id: "reaction-1",
      messageId: "msg-1",
      userId: "user-1",
      emoji: "👍",
    } as never);
    mockReactionDelete.mockResolvedValue({} as never);

    await DELETE(createDeleteRequest({ emoji: "👍" }), { params });

    expect(mockChannelsGet).toHaveBeenCalledWith("chat:conv-1");
    expect(mockPublish).toHaveBeenCalledWith("reaction", {
      messageId: "msg-1",
      emoji: "👍",
      userId: "user-1",
      action: "remove",
    });
  });

  it("still returns 200 if Ably publish fails", async () => {
    authenticateAsParticipant();
    mockReactionFindUnique.mockResolvedValue({
      id: "reaction-1",
      messageId: "msg-1",
      userId: "user-1",
      emoji: "👍",
    } as never);
    mockReactionDelete.mockResolvedValue({} as never);
    mockPublish.mockRejectedValueOnce(new Error("Ably down"));

    const res = await DELETE(createDeleteRequest({ emoji: "👍" }), { params });

    expect(res.status).toBe(200);
  });

  it("only allows deleting own reactions", async () => {
    authenticateAsParticipant("user-1");
    // Reaction belongs to user-1, lookup by user-1 + emoji should find it
    mockReactionFindUnique.mockResolvedValue(null);

    const res = await DELETE(createDeleteRequest({ emoji: "👍" }), { params });
    const data = await res.json();

    // The findUnique uses the compound key with the authenticated user's ID,
    // so if another user's reaction exists for this emoji, it won't be found
    expect(res.status).toBe(404);
    expect(data.error).toBe("Reaction not found");
  });
});
