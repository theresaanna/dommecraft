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
    user: {
      findUnique: vi.fn(),
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

import { POST } from "@/app/api/chat/[id]/read/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockConversationFindUnique = vi.mocked(prisma.conversation.findUnique);
const mockConversationUpdate = vi.mocked(prisma.conversation.update);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);

const params = Promise.resolve({ id: "conv-1" });

function createRequest() {
  return new Request("http://localhost:3000/api/chat/conv-1/read", {
    method: "POST",
  });
}

describe("POST /api/chat/[id]/read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConversationUpdate.mockResolvedValue({} as never);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(createRequest(), { params });
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

    const res = await POST(createRequest(), { params });
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

    const res = await POST(createRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("updates participant1LastReadAt when user is participant1", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockUserFindUnique.mockResolvedValue({
      showReadReceipts: true,
    } as never);

    const res = await POST(createRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.readAt).toBeDefined();
    expect(mockConversationUpdate).toHaveBeenCalledWith({
      where: { id: "conv-1" },
      data: { participant1LastReadAt: expect.any(Date) },
    });
  });

  it("updates participant2LastReadAt when user is participant2", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockUserFindUnique.mockResolvedValue({
      showReadReceipts: true,
    } as never);

    const res = await POST(createRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.readAt).toBeDefined();
    expect(mockConversationUpdate).toHaveBeenCalledWith({
      where: { id: "conv-1" },
      data: { participant2LastReadAt: expect.any(Date) },
    });
  });

  it("publishes read event to Ably channel", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockUserFindUnique.mockResolvedValue({
      showReadReceipts: true,
    } as never);

    await POST(createRequest(), { params });

    expect(mockChannelsGet).toHaveBeenCalledWith("chat:conv-1");
    expect(mockPublish).toHaveBeenCalledWith("read", {
      userId: "user-1",
      readAt: expect.any(String),
    });
  });

  it("returns readAt: null when user has showReadReceipts disabled", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockConversationFindUnique.mockResolvedValue({
      participant1Id: "user-1",
      participant2Id: "user-2",
    } as never);
    mockUserFindUnique.mockResolvedValue({
      showReadReceipts: false,
    } as never);

    const res = await POST(createRequest(), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.readAt).toBeNull();
    expect(mockConversationUpdate).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
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
    mockUserFindUnique.mockResolvedValue({
      showReadReceipts: true,
    } as never);
    mockPublish.mockRejectedValueOnce(new Error("Ably down"));

    const res = await POST(createRequest(), { params });

    expect(res.status).toBe(200);
  });
});
