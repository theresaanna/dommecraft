import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    groupMember: {
      findUnique: vi.fn(),
    },
  },
}));

import { isGroupMember, isGroupAdmin } from "@/lib/group-chat-access";
import { prisma } from "@/lib/prisma";

const mockFindUnique = vi.mocked(prisma.groupMember.findUnique);

describe("isGroupMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns isMember true and role when user is a member", async () => {
    mockFindUnique.mockResolvedValue({ role: "MEMBER" } as never);

    const result = await isGroupMember("group-1", "user-1");
    expect(result).toEqual({ isMember: true, role: "MEMBER" });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        groupConversationId_userId: {
          groupConversationId: "group-1",
          userId: "user-1",
        },
      },
      select: { role: true },
    });
  });

  it("returns isMember true and ADMIN role when user is an admin", async () => {
    mockFindUnique.mockResolvedValue({ role: "ADMIN" } as never);

    const result = await isGroupMember("group-1", "user-1");
    expect(result).toEqual({ isMember: true, role: "ADMIN" });
  });

  it("returns isMember false and null role when user is not a member", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await isGroupMember("group-1", "user-999");
    expect(result).toEqual({ isMember: false, role: null });
  });
});

describe("isGroupAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when user is an ADMIN", async () => {
    mockFindUnique.mockResolvedValue({ role: "ADMIN" } as never);

    const result = await isGroupAdmin("group-1", "user-1");
    expect(result).toBe(true);
  });

  it("returns false when user is a MEMBER", async () => {
    mockFindUnique.mockResolvedValue({ role: "MEMBER" } as never);

    const result = await isGroupAdmin("group-1", "user-2");
    expect(result).toBe(false);
  });

  it("returns false when user is not in the group", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await isGroupAdmin("group-1", "user-999");
    expect(result).toBe(false);
  });
});
