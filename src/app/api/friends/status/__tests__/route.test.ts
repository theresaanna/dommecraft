import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    friendship: {
      findFirst: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/friends/status/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindFirst = vi.mocked(prisma.friendship.findFirst);

function createRequest(userId?: string) {
  const url = userId
    ? `http://localhost:3000/api/friends/status?userId=${userId}`
    : "http://localhost:3000/api/friends/status";
  return new Request(url);
}

describe("GET /api/friends/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET(createRequest("user-2"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when userId query param is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);

    const res = await GET(createRequest());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("userId query parameter is required");
  });

  it("returns 'none' when no friendship exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindFirst.mockResolvedValue(null);

    const res = await GET(createRequest("user-2"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("none");
  });

  it("returns 'accepted' when friendship is accepted", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindFirst.mockResolvedValue({
      id: "f-1",
      requesterId: "user-1",
      addresseeId: "user-2",
      status: "ACCEPTED",
    } as never);

    const res = await GET(createRequest("user-2"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("accepted");
    expect(data.friendshipId).toBe("f-1");
  });

  it("returns 'pending_sent' when current user sent the request", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: "",
    } as never);
    mockFindFirst.mockResolvedValue({
      id: "f-1",
      requesterId: "user-1",
      addresseeId: "user-2",
      status: "PENDING",
    } as never);

    const res = await GET(createRequest("user-2"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("pending_sent");
    expect(data.friendshipId).toBe("f-1");
  });

  it("returns 'pending_received' when current user received the request", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2" },
      expires: "",
    } as never);
    mockFindFirst.mockResolvedValue({
      id: "f-1",
      requesterId: "user-1",
      addresseeId: "user-2",
      status: "PENDING",
    } as never);

    const res = await GET(createRequest("user-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("pending_received");
    expect(data.friendshipId).toBe("f-1");
  });
});
