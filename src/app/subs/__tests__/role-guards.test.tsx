// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "next/navigation";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subProfile: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    badge: { findMany: vi.fn().mockResolvedValue([]) },
    behaviorScore: { findMany: vi.fn().mockResolvedValue([]) },
    contract: { findMany: vi.fn().mockResolvedValue([]) },
    mediaItem: { findMany: vi.fn().mockResolvedValue([]) },
    rating: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

const REDIRECT_ERROR = new Error("NEXT_REDIRECT");
vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation(() => {
    throw REDIRECT_ERROR;
  }),
}));

import SubDetailPage from "../[id]/page";
import BadgesPage from "../[id]/badges/page";
import BehaviorPage from "../[id]/behavior/page";
import ContractsPage from "../[id]/contracts/page";
import MediaPage from "../[id]/media/page";
import RatingsPage from "../[id]/ratings/page";

const subSession = {
  user: { id: "sub-user-1", name: "Sub", email: "sub@test.com", role: "SUB" },
};

const params = Promise.resolve({ id: "sub-1" });

describe("Sub page role guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(subSession);
  });

  it("SubDetailPage redirects SUB users to /dashboard", async () => {
    await expect(SubDetailPage({ params })).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("BadgesPage redirects SUB users to /dashboard", async () => {
    await expect(BadgesPage({ params })).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("BehaviorPage redirects SUB users to /dashboard", async () => {
    await expect(BehaviorPage({ params })).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("ContractsPage redirects SUB users to /dashboard", async () => {
    await expect(ContractsPage({ params })).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("MediaPage redirects SUB users to /dashboard", async () => {
    await expect(MediaPage({ params })).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("RatingsPage redirects SUB users to /dashboard", async () => {
    await expect(RatingsPage({ params })).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });
});
