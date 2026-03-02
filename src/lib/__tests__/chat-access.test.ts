import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subProfile: {
      findFirst: vi.fn(),
    },
  },
}));

import { canDirectChat } from "@/lib/chat-access";
import { prisma } from "@/lib/prisma";

const mockFindFirst = vi.mocked(prisma.subProfile.findFirst);

describe("canDirectChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when userId equals recipientId", async () => {
    const result = await canDirectChat("user-1", "user-1");
    expect(result).toBe(false);
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("returns true when users are linked via SubProfile (userId -> linkedUserId)", async () => {
    mockFindFirst.mockResolvedValue({ id: "sub-1" } as never);

    const result = await canDirectChat("user-1", "user-2");
    expect(result).toBe(true);
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { userId: "user-1", linkedUserId: "user-2" },
          { userId: "user-2", linkedUserId: "user-1" },
        ],
      },
      select: { id: true },
    });
  });

  it("returns true when users are linked in reverse direction", async () => {
    mockFindFirst.mockResolvedValue({ id: "sub-2" } as never);

    const result = await canDirectChat("user-2", "user-1");
    expect(result).toBe(true);
  });

  it("returns false when users are not linked", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await canDirectChat("user-1", "user-3");
    expect(result).toBe(false);
  });
});
