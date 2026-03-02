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
    chatMessage: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    groupMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    notification: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
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

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
}));

vi.mock("@/lib/arachnid-shield", () => ({
  scanFile: vi.fn(),
}));

import { GET, POST } from "@/app/api/chat/group/[id]/messages/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isGroupMember } from "@/lib/group-chat-access";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockGroupFindUnique = vi.mocked(prisma.groupConversation.findUnique);
const mockIsGroupMember = vi.mocked(isGroupMember);
const mockMessageFindMany = vi.mocked(prisma.chatMessage.findMany);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockTransaction = vi.mocked(prisma.$transaction) as any;
const mockMemberFindMany = vi.mocked(prisma.groupMember.findMany);
const mockNotificationFindFirst = vi.mocked(prisma.notification.findFirst);
const mockNotificationCreate = vi.mocked(prisma.notification.create);
const mockNotificationUpdate = vi.mocked(prisma.notification.update);

const mockParams = Promise.resolve({ id: "group-1" });

function createGetRequest(query = "") {
  return new Request(
    `http://localhost:3000/api/chat/group/group-1/messages${query}`
  );
}

function createPostRequest(body: Record<string, unknown>) {
  return new Request(
    "http://localhost:3000/api/chat/group/group-1/messages",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

describe("GET /api/chat/group/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET(createGetRequest(), { params: mockParams });
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

    const res = await GET(createGetRequest(), { params: mockParams });
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

    const res = await GET(createGetRequest(), { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns messages with senderName", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });
    mockMessageFindMany.mockResolvedValue([
      {
        id: "msg-1",
        senderId: "user-2",
        content: "Hello group",
        mediaUrl: null,
        mediaMimeType: null,
        mediaFileSize: null,
        editedAt: null,
        createdAt: new Date("2025-01-01T12:00:00Z"),
        reactions: [],
        replyTo: null,
        sender: { name: "Bob" },
      },
    ] as never);

    const res = await GET(createGetRequest(), { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].senderName).toBe("Bob");
    expect(data[0].content).toBe("Hello group");
    expect(data[0].createdAt).toBe("2025-01-01T12:00:00.000Z");
    expect(data[0].editedAt).toBeNull();
    expect(data[0].replyTo).toBeNull();
  });

  it("passes before cursor to query", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });
    mockMessageFindMany.mockResolvedValue([] as never);

    await GET(createGetRequest("?before=2025-01-01T12:00:00Z"), {
      params: mockParams,
    });

    expect(mockMessageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          groupConversationId: "group-1",
          createdAt: { lt: new Date("2025-01-01T12:00:00Z") },
        },
      })
    );
  });
});

describe("POST /api/chat/group/[id]/messages (JSON)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMemberFindMany.mockResolvedValue([] as never);
    mockNotificationFindFirst.mockResolvedValue(null);
    mockNotificationCreate.mockResolvedValue({} as never);
    mockNotificationUpdate.mockResolvedValue({} as never);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(createPostRequest({ content: "Hi" }), {
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

    const res = await POST(createPostRequest({ content: "Hi" }), {
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

    const res = await POST(createPostRequest({ content: "Hi" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 400 when content is empty", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });

    const res = await POST(createPostRequest({ content: "   " }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Message content is required");
  });

  it("creates message with groupConversationId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });

    const createdMessage = {
      id: "msg-1",
      senderId: "user-1",
      content: "Hello!",
      mediaUrl: null,
      mediaMimeType: null,
      mediaFileSize: null,
      editedAt: null,
      createdAt: new Date("2025-01-01T12:00:00Z"),
      replyTo: null,
      sender: { name: "Alice" },
    };
    mockTransaction.mockResolvedValue([createdMessage, {}]);

    const res = await POST(createPostRequest({ content: "Hello!" }), {
      params: mockParams,
    });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("msg-1");
    expect(data.content).toBe("Hello!");
    expect(data.senderName).toBe("Alice");
    expect(data.createdAt).toBe("2025-01-01T12:00:00.000Z");
  });

  it("publishes to Ably channel group:{id}", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });

    const createdMessage = {
      id: "msg-1",
      senderId: "user-1",
      content: "Hello!",
      mediaUrl: null,
      mediaMimeType: null,
      mediaFileSize: null,
      editedAt: null,
      createdAt: new Date("2025-01-01T12:00:00Z"),
      replyTo: null,
      sender: { name: "Alice" },
    };
    mockTransaction.mockResolvedValue([createdMessage, {}]);

    await POST(createPostRequest({ content: "Hello!" }), {
      params: mockParams,
    });

    expect(mockChannelsGet).toHaveBeenCalledWith("group:group-1");
    expect(mockPublish).toHaveBeenCalledWith(
      "message",
      expect.objectContaining({
        id: "msg-1",
        senderId: "user-1",
        content: "Hello!",
        senderName: "Alice",
        editedAt: null,
        createdAt: "2025-01-01T12:00:00.000Z",
        replyTo: null,
      })
    );
  });

  it("still returns 201 if Ably publish fails", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockGroupFindUnique.mockResolvedValue({ id: "group-1" } as never);
    mockIsGroupMember.mockResolvedValue({ isMember: true, role: "MEMBER" });

    const createdMessage = {
      id: "msg-1",
      senderId: "user-1",
      content: "Hello!",
      mediaUrl: null,
      mediaMimeType: null,
      mediaFileSize: null,
      editedAt: null,
      createdAt: new Date("2025-01-01T12:00:00Z"),
      replyTo: null,
      sender: { name: "Alice" },
    };
    mockTransaction.mockResolvedValue([createdMessage, {}]);
    mockPublish.mockRejectedValueOnce(new Error("Ably down"));

    const res = await POST(createPostRequest({ content: "Hello!" }), {
      params: mockParams,
    });

    expect(res.status).toBe(201);
  });
});
