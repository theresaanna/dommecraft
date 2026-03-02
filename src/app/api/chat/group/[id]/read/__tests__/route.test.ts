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
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ably", () => ({
  getAblyRest: vi.fn().mockReturnValue({
    channels: { get: mockChannelsGet },
  }),
}));

import { POST } from "@/app/api/chat/group/[id]/read/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockMemberFindUnique = vi.mocked(prisma.groupMember.findUnique);
const mockMemberUpdate = vi.mocked(prisma.groupMember.update);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);

const mockParams = Promise.resolve({ id: "group-1" });

function createRequest() {
  return new Request("http://localhost:3000/api/chat/group/group-1/read", {
    method: "POST",
  });
}

describe("POST /api/chat/group/[id]/read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMemberUpdate.mockResolvedValue({} as never);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(createRequest(), { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when not a member", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockMemberFindUnique.mockResolvedValue(null);

    const res = await POST(createRequest(), { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns readAt: null when showReadReceipts is false", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockMemberFindUnique.mockResolvedValue({
      id: "member-1",
      groupConversationId: "group-1",
      userId: "user-1",
    } as never);
    mockUserFindUnique.mockResolvedValue({
      showReadReceipts: false,
    } as never);

    const res = await POST(createRequest(), { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.readAt).toBeNull();
    expect(mockMemberUpdate).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("updates GroupMember.lastReadAt and publishes read event", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockMemberFindUnique.mockResolvedValue({
      id: "member-1",
      groupConversationId: "group-1",
      userId: "user-1",
    } as never);
    mockUserFindUnique.mockResolvedValue({
      showReadReceipts: true,
    } as never);

    const res = await POST(createRequest(), { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.readAt).toBeDefined();
    expect(typeof data.readAt).toBe("string");

    expect(mockMemberUpdate).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { lastReadAt: expect.any(Date) },
    });

    expect(mockChannelsGet).toHaveBeenCalledWith("group:group-1");
    expect(mockPublish).toHaveBeenCalledWith("read", {
      userId: "user-1",
      readAt: expect.any(String),
    });
  });

  it("still returns readAt if Ably publish fails", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Alice" },
      expires: "",
    } as never);
    mockMemberFindUnique.mockResolvedValue({
      id: "member-1",
      groupConversationId: "group-1",
      userId: "user-1",
    } as never);
    mockUserFindUnique.mockResolvedValue({
      showReadReceipts: true,
    } as never);
    mockPublish.mockRejectedValueOnce(new Error("Ably down"));

    const res = await POST(createRequest(), { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.readAt).toBeDefined();
    expect(typeof data.readAt).toBe("string");
  });
});
