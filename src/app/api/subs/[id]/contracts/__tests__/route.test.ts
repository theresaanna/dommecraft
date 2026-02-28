import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contract: {
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

import { GET, POST } from "@/app/api/subs/[id]/contracts/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { verifySubOwnership } from "@/lib/api-helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockVerifySubOwnership = vi.mocked(verifySubOwnership);
const mockFindMany = vi.mocked(prisma.contract.findMany);
const mockCreate = vi.mocked(prisma.contract.create);

const routeParams = { params: Promise.resolve({ id: "sub-1" }) };

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/subs/sub-1/contracts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/subs/[id]/contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost:3000/api/subs/sub-1/contracts"
    );
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

    const request = new Request(
      "http://localhost:3000/api/subs/sub-1/contracts"
    );
    const res = await GET(request, routeParams);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Sub profile not found");
  });

  it("returns list of contracts", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockVerifySubOwnership.mockResolvedValue(true);

    const contracts = [
      { id: "contract-1", title: "Service Agreement", content: "Terms...", subId: "sub-1", userId: "user-1" },
      { id: "contract-2", title: "NDA", content: "Non-disclosure...", subId: "sub-1", userId: "user-1" },
    ];
    mockFindMany.mockResolvedValue(contracts as never);

    const request = new Request(
      "http://localhost:3000/api/subs/sub-1/contracts"
    );
    const res = await GET(request, routeParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(contracts);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { subId: "sub-1", userId: "user-1" },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("POST /api/subs/[id]/contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(
      createRequest({ title: "Test", content: "Content" }),
      routeParams
    );
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

    const res = await POST(
      createRequest({ title: "Test", content: "Content" }),
      routeParams
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Sub profile not found");
  });

  it("returns 400 when title is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockVerifySubOwnership.mockResolvedValue(true);

    const res = await POST(
      createRequest({ content: "Some content" }),
      routeParams
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Contract title is required");
  });

  it("returns 400 when content is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockVerifySubOwnership.mockResolvedValue(true);

    const res = await POST(
      createRequest({ title: "Service Agreement" }),
      routeParams
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Contract content is required");
  });

  it("returns 201 on success", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    });
    mockVerifySubOwnership.mockResolvedValue(true);

    const contract = {
      id: "contract-1",
      title: "Service Agreement",
      content: "Terms and conditions...",
      userId: "user-1",
      subId: "sub-1",
    };
    mockCreate.mockResolvedValue(contract as never);

    const res = await POST(
      createRequest({ title: "Service Agreement", content: "Terms and conditions..." }),
      routeParams
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual(contract);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          subId: "sub-1",
          title: "Service Agreement",
          content: "Terms and conditions...",
        }),
      })
    );
  });
});
