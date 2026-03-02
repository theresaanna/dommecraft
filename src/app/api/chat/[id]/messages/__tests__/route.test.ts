import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    chatMessage: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    notification: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
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

import { GET, POST } from "@/app/api/chat/[id]/messages/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindUnique = vi.mocked(prisma.conversation.findUnique);
const mockFindMany = vi.mocked(prisma.chatMessage.findMany);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockTransaction = vi.mocked(prisma.$transaction) as any;
const mockNotificationFindFirst = vi.mocked(prisma.notification.findFirst);
const mockNotificationCreate = vi.mocked(prisma.notification.create);
const mockNotificationUpdate = vi.mocked(prisma.notification.update);

const params = Promise.resolve({ id: "conv-1" });

function createGetRequest(query = "") {
  return new Request(
    `http://localhost:3000/api/chat/conv-1/messages${query}`
  );
}

function createPostRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/chat/conv-1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/chat/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when conversation does not exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue(null);

    const res = await GET(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Conversation not found");
  });

  it("returns 403 when user is not a participant", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-3" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);

    const res = await GET(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns messages for a valid participant", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockFindMany.mockResolvedValue([
      {
        id: "msg-1",
        senderId: "user-2",
        content: "Hi",
        createdAt: new Date("2025-01-01T12:00:00Z"),
      },
    ] as never);

    const res = await GET(createGetRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].content).toBe("Hi");
    expect(data[0].createdAt).toBe("2025-01-01T12:00:00.000Z");
  });

  it("passes before cursor to query", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockFindMany.mockResolvedValue([] as never);

    await GET(createGetRequest("?before=2025-01-01T12:00:00Z"), { params });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          conversationId: "conv-1",
          createdAt: { lt: new Date("2025-01-01T12:00:00Z") },
        },
      })
    );
  });
});

describe("POST /api/chat/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationFindFirst.mockResolvedValue(null);
    mockNotificationCreate.mockResolvedValue({} as never);
    mockNotificationUpdate.mockResolvedValue({} as never);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(createPostRequest({ content: "Hi" }), { params });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when conversation does not exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue(null);

    const res = await POST(createPostRequest({ content: "Hi" }), { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Conversation not found");
  });

  it("returns 403 when user is not a participant", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-3" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);

    const res = await POST(createPostRequest({ content: "Hi" }), { params });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 400 when content is empty", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);

    const res = await POST(createPostRequest({ content: "   " }), { params });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Message content is required");
  });

  it("returns 400 when content is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);

    const res = await POST(createPostRequest({}), { params });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Message content is required");
  });

  it("creates a message and returns 201", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);

    const createdMessage = {
      id: "msg-1",
      senderId: "user-1",
      content: "Hello!",
      createdAt: new Date("2025-01-01T12:00:00Z"),
    };
    mockTransaction.mockResolvedValue([createdMessage, {}]);

    const res = await POST(createPostRequest({ content: "Hello!" }), {
      params,
    });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("msg-1");
    expect(data.content).toBe("Hello!");
    expect(data.createdAt).toBe("2025-01-01T12:00:00.000Z");
  });

  it("publishes message to Ably channel after creation", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);

    const createdMessage = {
      id: "msg-1",
      senderId: "user-1",
      content: "Hello!",
      createdAt: new Date("2025-01-01T12:00:00Z"),
    };
    mockTransaction.mockResolvedValue([createdMessage, {}]);

    await POST(createPostRequest({ content: "Hello!" }), { params });

    expect(mockChannelsGet).toHaveBeenCalledWith("chat:conv-1");
    expect(mockPublish).toHaveBeenCalledWith("message", {
      id: "msg-1",
      senderId: "user-1",
      content: "Hello!",
      createdAt: "2025-01-01T12:00:00.000Z",
    });
  });

  it("still returns 201 if Ably publish fails", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);

    const createdMessage = {
      id: "msg-1",
      senderId: "user-1",
      content: "Hello!",
      createdAt: new Date("2025-01-01T12:00:00Z"),
    };
    mockTransaction.mockResolvedValue([createdMessage, {}]);
    mockPublish.mockRejectedValueOnce(new Error("Ably down"));

    const res = await POST(createPostRequest({ content: "Hello!" }), {
      params,
    });

    expect(res.status).toBe(201);
  });

  it("trims whitespace from content", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);

    const createdMessage = {
      id: "msg-2",
      senderId: "user-1",
      content: "trimmed",
      createdAt: new Date("2025-01-01T12:00:00Z"),
    };
    mockTransaction.mockResolvedValue([createdMessage, {}]);

    const res = await POST(createPostRequest({ content: "  trimmed  " }), {
      params,
    });
    const data = await res.json();

    expect(data.content).toBe("trimmed");
  });

  it("creates a notification for the recipient when no unread exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockTransaction.mockResolvedValue([
      { id: "msg-1", senderId: "user-1", content: "Hi", createdAt: new Date("2025-01-01T12:00:00Z") },
      {},
    ]);
    mockNotificationFindFirst.mockResolvedValue(null);

    await POST(createPostRequest({ content: "Hi" }), { params });

    expect(mockNotificationFindFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-2",
        type: "CHAT_MESSAGE",
        isRead: false,
        linkUrl: "/chat/conv-1",
      },
      select: { id: true },
    });
    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-2",
        type: "CHAT_MESSAGE",
        message: "Received messages from Alice",
        linkUrl: "/chat/conv-1",
      },
    });
  });

  it("updates existing unread notification instead of creating a new one", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockTransaction.mockResolvedValue([
      { id: "msg-1", senderId: "user-1", content: "Hi again", createdAt: new Date("2025-01-01T12:00:00Z") },
      {},
    ]);
    mockNotificationFindFirst.mockResolvedValue({ id: "notif-existing" } as never);

    await POST(createPostRequest({ content: "Hi again" }), { params });

    expect(mockNotificationUpdate).toHaveBeenCalledWith({
      where: { id: "notif-existing" },
      data: { createdAt: expect.any(Date) },
    });
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it("sends notification to participant1 when sender is participant2", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2", name: "Bob" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockTransaction.mockResolvedValue([
      { id: "msg-1", senderId: "user-2", content: "Hey", createdAt: new Date("2025-01-01T12:00:00Z") },
      {},
    ]);

    await POST(createPostRequest({ content: "Hey" }), { params });

    expect(mockNotificationFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1" }),
      })
    );
  });

  it("uses 'Someone' as sender name when session name is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockTransaction.mockResolvedValue([
      { id: "msg-1", senderId: "user-1", content: "Hi", createdAt: new Date("2025-01-01T12:00:00Z") },
      {},
    ]);

    await POST(createPostRequest({ content: "Hi" }), { params });

    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        message: "Received messages from Someone",
      }),
    });
  });

  it("still returns 201 if notification creation fails", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockTransaction.mockResolvedValue([
      { id: "msg-1", senderId: "user-1", content: "Hi", createdAt: new Date("2025-01-01T12:00:00Z") },
      {},
    ]);
    mockNotificationFindFirst.mockRejectedValueOnce(new Error("DB error"));

    const res = await POST(createPostRequest({ content: "Hi" }), { params });

    expect(res.status).toBe(201);
  });
});
