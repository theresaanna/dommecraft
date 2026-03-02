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
      update: vi.fn(),
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

import { PUT } from "@/app/api/chat/[id]/messages/[messageId]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockConversationFindUnique = vi.mocked(prisma.conversation.findUnique);
const mockMessageFindUnique = vi.mocked(prisma.chatMessage.findUnique);
const mockMessageUpdate = vi.mocked(prisma.chatMessage.update);

const params = Promise.resolve({ id: "conv-1", messageId: "msg-1" });

function createPutRequest(body: Record<string, unknown>) {
  return new Request(
    "http://localhost:3000/api/chat/conv-1/messages/msg-1",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

describe("PUT /api/chat/[id]/messages/[messageId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await PUT(createPutRequest({ content: "edited" }), { params });
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

    const res = await PUT(createPutRequest({ content: "edited" }), { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Conversation not found");
  });

  it("returns 403 when user is not a conversation participant", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-3" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);

    const res = await PUT(createPutRequest({ content: "edited" }), { params });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 404 when message does not exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockMessageFindUnique.mockResolvedValue(null);

    const res = await PUT(createPutRequest({ content: "edited" }), { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Message not found");
  });

  it("returns 404 when message belongs to a different conversation", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-other",
      senderId: "user-1",
    } as never);

    const res = await PUT(createPutRequest({ content: "edited" }), { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Message not found");
  });

  it("returns 403 when user tries to edit someone else's message", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "user-2",
    } as never);

    const res = await PUT(createPutRequest({ content: "edited" }), { params });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("You can only edit your own messages");
  });

  it("returns 400 when content is empty", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "user-1",
    } as never);

    const res = await PUT(createPutRequest({ content: "   " }), { params });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Message content is required");
  });

  it("returns 400 when content is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "user-1",
    } as never);

    const res = await PUT(createPutRequest({}), { params });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Message content is required");
  });

  it("updates the message and returns 200 with editedAt", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "user-1",
    } as never);

    const editedAt = new Date("2025-01-01T13:00:00Z");
    mockMessageUpdate.mockResolvedValue({
      id: "msg-1",
      senderId: "user-1",
      content: "edited content",
      mediaUrl: null,
      mediaMimeType: null,
      mediaFileSize: null,
      editedAt,
      createdAt: new Date("2025-01-01T12:00:00Z"),
      reactions: [],
    } as never);

    const res = await PUT(createPutRequest({ content: "edited content" }), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.content).toBe("edited content");
    expect(data.editedAt).toBe("2025-01-01T13:00:00.000Z");
    expect(data.createdAt).toBe("2025-01-01T12:00:00.000Z");
  });

  it("trims whitespace from content", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "user-1",
    } as never);
    mockMessageUpdate.mockResolvedValue({
      id: "msg-1",
      senderId: "user-1",
      content: "trimmed",
      mediaUrl: null,
      mediaMimeType: null,
      mediaFileSize: null,
      editedAt: new Date("2025-01-01T13:00:00Z"),
      createdAt: new Date("2025-01-01T12:00:00Z"),
      reactions: [],
    } as never);

    const res = await PUT(createPutRequest({ content: "  trimmed  " }), { params });
    const data = await res.json();

    expect(data.content).toBe("trimmed");
  });

  it("publishes edit event to Ably channel", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "user-1",
    } as never);
    mockMessageUpdate.mockResolvedValue({
      id: "msg-1",
      senderId: "user-1",
      content: "edited content",
      mediaUrl: null,
      mediaMimeType: null,
      mediaFileSize: null,
      editedAt: new Date("2025-01-01T13:00:00Z"),
      createdAt: new Date("2025-01-01T12:00:00Z"),
      reactions: [],
    } as never);

    await PUT(createPutRequest({ content: "edited content" }), { params });

    expect(mockChannelsGet).toHaveBeenCalledWith("chat:conv-1");
    expect(mockPublish).toHaveBeenCalledWith("edit", expect.objectContaining({
      id: "msg-1",
      content: "edited content",
      editedAt: "2025-01-01T13:00:00.000Z",
    }));
  });

  it("still returns 200 if Ably publish fails", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "user-1",
    } as never);
    mockMessageUpdate.mockResolvedValue({
      id: "msg-1",
      senderId: "user-1",
      content: "edited",
      mediaUrl: null,
      mediaMimeType: null,
      mediaFileSize: null,
      editedAt: new Date("2025-01-01T13:00:00Z"),
      createdAt: new Date("2025-01-01T12:00:00Z"),
      reactions: [],
    } as never);
    mockPublish.mockRejectedValueOnce(new Error("Ably down"));

    const res = await PUT(createPutRequest({ content: "edited" }), { params });

    expect(res.status).toBe(200);
  });

  it("includes reactions in the response", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockMessageFindUnique.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "user-1",
    } as never);
    mockMessageUpdate.mockResolvedValue({
      id: "msg-1",
      senderId: "user-1",
      content: "edited",
      mediaUrl: null,
      mediaMimeType: null,
      mediaFileSize: null,
      editedAt: new Date("2025-01-01T13:00:00Z"),
      createdAt: new Date("2025-01-01T12:00:00Z"),
      reactions: [{ emoji: "👍", userId: "user-2" }],
    } as never);

    const res = await PUT(createPutRequest({ content: "edited" }), { params });
    const data = await res.json();

    expect(data.reactions).toEqual([{ emoji: "👍", userId: "user-2" }]);
  });
});
