import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    subProfile: {
      findUnique: vi.fn(),
    },
  },
}));

import { verifySubOwnership } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const mockFindUnique = vi.mocked(prisma.subProfile.findUnique);

describe("verifySubOwnership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when sub belongs to user", async () => {
    mockFindUnique.mockResolvedValue({ id: "sub-1" } as never);

    const result = await verifySubOwnership("sub-1", "user-1");

    expect(result).toBe(true);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "sub-1", userId: "user-1" },
      select: { id: true },
    });
  });

  it("returns false when sub does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await verifySubOwnership("nonexistent-sub", "user-1");

    expect(result).toBe(false);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "nonexistent-sub", userId: "user-1" },
      select: { id: true },
    });
  });

  it("returns false when sub belongs to different user", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await verifySubOwnership("sub-1", "wrong-user");

    expect(result).toBe(false);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "sub-1", userId: "wrong-user" },
      select: { id: true },
    });
  });
});
