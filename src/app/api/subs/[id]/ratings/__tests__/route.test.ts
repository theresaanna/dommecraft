import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rating: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/api-helpers", () => ({
  verifySubOwnership: vi.fn(),
}));

import { GET, POST } from "@/app/api/subs/[id]/ratings/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { verifySubOwnership } from "@/lib/api-helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockVerifySubOwnership = vi.mocked(verifySubOwnership);
const mockFindMany = vi.mocked(prisma.rating.findMany);
const mockCreate = vi.mocked(prisma.rating.create);

const routeParams = { params: Promise.resolve({ id: "sub-1" }) };

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/subs/sub-1/ratings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/subs/[id]/ratings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/subs/sub-1/ratings");
    const res = await GET(request, routeParams);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when sub not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockVerifySubOwnership.mockResolvedValue(false);

    const request = new Request("http://localhost:3000/api/subs/sub-1/ratings");
    const res = await GET(request, routeParams);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Sub profile not found");
  });

  it("returns list of ratings", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockVerifySubOwnership.mockResolvedValue(true);

    const ratings = [
      { id: "rating-1", overall: 8, subId: "sub-1", userId: "user-1" },
      { id: "rating-2", overall: 6, subId: "sub-1", userId: "user-1" },
    ];
    mockFindMany.mockResolvedValue(ratings as never);

    const request = new Request("http://localhost:3000/api/subs/sub-1/ratings");
    const res = await GET(request, routeParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(ratings);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { subId: "sub-1", userId: "user-1" },
      orderBy: { ratedAt: "desc" },
    });
  });
});

describe("POST /api/subs/[id]/ratings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(createRequest({ overall: 5 }), routeParams);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when sub not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockVerifySubOwnership.mockResolvedValue(false);

    const res = await POST(createRequest({ overall: 5 }), routeParams);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Sub profile not found");
  });

  it("returns 400 when overall is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockVerifySubOwnership.mockResolvedValue(true);

    const res = await POST(createRequest({}), routeParams);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Overall rating is required and must be a number");
  });

  it("returns 400 when overall is below range", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockVerifySubOwnership.mockResolvedValue(true);

    const res = await POST(createRequest({ overall: 0 }), routeParams);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Overall rating must be between 1 and 10");
  });

  it("returns 400 when overall is above range", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockVerifySubOwnership.mockResolvedValue(true);

    const res = await POST(createRequest({ overall: 11 }), routeParams);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Overall rating must be between 1 and 10");
  });

  it("returns 201 on success", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockVerifySubOwnership.mockResolvedValue(true);

    const rating = {
      id: "rating-1",
      overall: 8,
      userId: "user-1",
      subId: "sub-1",
    };
    mockCreate.mockResolvedValue(rating as never);

    const res = await POST(createRequest({ overall: 8 }), routeParams);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual(rating);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          subId: "sub-1",
          overall: 8,
        }),
      })
    );
  });
});
