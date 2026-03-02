import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    groupConversation: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/chat-access", () => ({
  canDirectChat: vi.fn(),
}));

import { GET, POST } from "@/app/api/chat/group/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canDirectChat } from "@/lib/chat-access";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindMany = vi.mocked(prisma.groupConversation.findMany);
const mockTransaction = vi.mocked(prisma.$transaction) as any;
const mockCanDirectChat = vi.mocked(canDirectChat);

function createPostRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/chat/group", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/chat/group", () => {
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

  it("returns empty array when user has no groups", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([] as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("returns groups with last message and member count", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([
      {
        id: "group-1",
        name: "Test Group",
        members: [{ userId: "user-1" }, { userId: "user-2" }, { userId: "user-3" }],
        messages: [
          {
            content: "Hello group!",
            createdAt: new Date("2025-01-01T12:00:00Z"),
            senderId: "user-2",
            mediaMimeType: null,
            sender: { name: "Bob" },
          },
        ],
        updatedAt: new Date("2025-01-01T12:00:00Z"),
      },
    ] as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Test Group");
    expect(data[0].memberCount).toBe(3);
    expect(data[0].lastMessage.content).toBe("Hello group!");
    expect(data[0].lastMessage.senderName).toBe("Bob");
  });

  it("returns null lastMessage when group has no messages", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([
      {
        id: "group-1",
        name: "Empty Group",
        members: [{ userId: "user-1" }],
        messages: [],
        updatedAt: new Date("2025-01-01T12:00:00Z"),
      },
    ] as never);

    const res = await GET();
    const data = await res.json();

    expect(data[0].lastMessage).toBeNull();
  });
});

describe("POST /api/chat/group", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(
      createPostRequest({ name: "Group", memberIds: ["user-2"] })
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when name is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    const res = await POST(createPostRequest({ memberIds: ["user-2"] }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Group name is required");
  });

  it("returns 400 when name is empty string", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    const res = await POST(
      createPostRequest({ name: "   ", memberIds: ["user-2"] })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Group name is required");
  });

  it("returns 400 when name exceeds 100 characters", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    const res = await POST(
      createPostRequest({ name: "a".repeat(101), memberIds: ["user-2"] })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Group name must be 100 characters or less");
  });

  it("returns 400 when memberIds is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    const res = await POST(createPostRequest({ name: "Group" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("At least one member is required");
  });

  it("returns 400 when memberIds is empty", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    const res = await POST(
      createPostRequest({ name: "Group", memberIds: [] })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("At least one member is required");
  });

  it("returns 400 when memberIds only contains self", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    const res = await POST(
      createPostRequest({ name: "Group", memberIds: ["user-1"] })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("At least one other member is required");
  });

  it("returns 403 when canDirectChat returns false for a member", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockCanDirectChat.mockResolvedValue(false);

    const res = await POST(
      createPostRequest({ name: "Group", memberIds: ["user-2"] })
    );
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Cannot add user user-2 to group");
  });

  it("creates group with creator as ADMIN and members as MEMBER", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockCanDirectChat.mockResolvedValue(true);

    const createdGroup = {
      id: "group-1",
      name: "My Group",
      updatedAt: new Date("2025-01-01T12:00:00Z"),
      members: [
        {
          role: "ADMIN",
          user: { id: "user-1", name: "Alice", avatarUrl: null },
        },
        {
          role: "MEMBER",
          user: { id: "user-2", name: "Bob", avatarUrl: null },
        },
      ],
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        groupConversation: {
          create: vi.fn().mockResolvedValue(createdGroup),
        },
      });
    });

    const res = await POST(
      createPostRequest({ name: "My Group", memberIds: ["user-2"] })
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("group-1");
    expect(data.name).toBe("My Group");
    expect(data.members).toHaveLength(2);
    expect(data.members[0]).toEqual({
      id: "user-1",
      name: "Alice",
      avatarUrl: null,
      role: "ADMIN",
    });
    expect(data.members[1]).toEqual({
      id: "user-2",
      name: "Bob",
      avatarUrl: null,
      role: "MEMBER",
    });
  });

  it("filters out current user from memberIds", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockCanDirectChat.mockResolvedValue(true);

    const createdGroup = {
      id: "group-1",
      name: "Group",
      updatedAt: new Date("2025-01-01T12:00:00Z"),
      members: [
        {
          role: "ADMIN",
          user: { id: "user-1", name: "Alice", avatarUrl: null },
        },
        {
          role: "MEMBER",
          user: { id: "user-2", name: "Bob", avatarUrl: null },
        },
      ],
    };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        groupConversation: {
          create: vi.fn().mockResolvedValue(createdGroup),
        },
      });
    });

    const res = await POST(
      createPostRequest({
        name: "Group",
        memberIds: ["user-1", "user-2"],
      })
    );

    expect(res.status).toBe(201);
    // canDirectChat should only be called for user-2, not user-1
    expect(mockCanDirectChat).toHaveBeenCalledTimes(1);
    expect(mockCanDirectChat).toHaveBeenCalledWith("user-1", "user-2");
  });
});
