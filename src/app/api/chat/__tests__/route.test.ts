import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/chat-access", () => ({
  canDirectChat: vi.fn(),
}));

import { GET, POST } from "@/app/api/chat/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canDirectChat } from "@/lib/chat-access";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindMany = vi.mocked(prisma.conversation.findMany);
const mockUpsert = vi.mocked(prisma.conversation.upsert);
const mockCanDirectChat = vi.mocked(canDirectChat);

function createPostRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns conversations with other participant and last message", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([
      {
        id: "conv-1",
        participant1Id: "user-1",
        participant2Id: "user-2",
        participant1: { id: "user-1", name: "Alice", avatarUrl: null },
        participant2: { id: "user-2", name: "Bob", avatarUrl: null },
        messages: [
          {
            content: "Hello!",
            createdAt: new Date("2025-01-01T12:00:00Z"),
            senderId: "user-2",
          },
        ],
        updatedAt: new Date("2025-01-01T12:00:00Z"),
      },
    ] as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].other.name).toBe("Bob");
    expect(data[0].lastMessage.content).toBe("Hello!");
  });

  it("returns conversations with null lastMessage when no messages", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([
      {
        id: "conv-1",
        participant1Id: "user-1",
        participant2Id: "user-2",
        participant1: { id: "user-1", name: "Alice", avatarUrl: null },
        participant2: { id: "user-2", name: "Bob", avatarUrl: null },
        messages: [],
        updatedAt: new Date("2025-01-01T12:00:00Z"),
      },
    ] as never);

    const res = await GET();
    const data = await res.json();

    expect(data[0].lastMessage).toBeNull();
  });
});

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(createPostRequest({ recipientId: "user-2" }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when recipientId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    const res = await POST(createPostRequest({}));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("recipientId is required");
  });

  it("returns 400 when trying to chat with yourself", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    const res = await POST(createPostRequest({ recipientId: "user-1" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Cannot chat with yourself");
  });

  it("returns 403 when users cannot direct chat", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockCanDirectChat.mockResolvedValue(false);

    const res = await POST(createPostRequest({ recipientId: "user-3" }));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Chat request required");
  });

  it("creates a conversation with normalized participant order", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2" },
      expires: "",
    } as never);
    mockCanDirectChat.mockResolvedValue(true);
    mockUpsert.mockResolvedValue({
      id: "conv-1",
      participant1Id: "user-1",
      participant2Id: "user-2",
      participant1: { id: "user-1", name: "Alice", avatarUrl: null },
      participant2: { id: "user-2", name: "Bob", avatarUrl: null },
      updatedAt: new Date("2025-01-01T12:00:00Z"),
    } as never);

    const res = await POST(createPostRequest({ recipientId: "user-1" }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.other.name).toBe("Alice");
    // user-1 < user-2, so participant1 should be user-1
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          participant1Id_participant2Id: {
            participant1Id: "user-1",
            participant2Id: "user-2",
          },
        },
      })
    );
  });

  it("returns existing conversation on upsert", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockCanDirectChat.mockResolvedValue(true);
    mockUpsert.mockResolvedValue({
      id: "conv-existing",
      participant1Id: "user-1",
      participant2Id: "user-2",
      participant1: { id: "user-1", name: "Alice", avatarUrl: null },
      participant2: { id: "user-2", name: "Bob", avatarUrl: null },
      updatedAt: new Date("2025-01-01T12:00:00Z"),
    } as never);

    const res = await POST(createPostRequest({ recipientId: "user-2" }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("conv-existing");
  });
});
