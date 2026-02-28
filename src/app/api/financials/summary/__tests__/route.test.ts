import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    financialEntry: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    subProfile: {
      findMany: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { GET } from "@/app/api/financials/summary/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockAggregate = vi.mocked(prisma.financialEntry.aggregate);
const mockGroupBy = vi.mocked(prisma.financialEntry.groupBy);
const mockSubFindMany = vi.mocked(prisma.subProfile.findMany);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockQueryRaw = vi.mocked(prisma.$queryRawUnsafe) as any;

describe("GET /api/financials/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET(
      new Request("http://localhost:3000/api/financials/summary")
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when user is SUB role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "SUB" },
      expires: "",
    } as never);

    const res = await GET(
      new Request("http://localhost:3000/api/financials/summary")
    );
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns zeros when no entries exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockAggregate.mockResolvedValue({
      _sum: { amount: null },
      _avg: { amount: null },
      _count: 0,
    } as never);
    mockGroupBy.mockResolvedValue([] as never);
    mockQueryRaw.mockResolvedValue([]);

    const res = await GET(
      new Request("http://localhost:3000/api/financials/summary")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(0);
    expect(data.average).toBe(0);
    expect(data.count).toBe(0);
    expect(data.perSub).toEqual([]);
    expect(data.byCategory).toEqual([]);
    expect(data.trend).toEqual([]);
  });

  it("returns correct aggregate values", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockAggregate.mockResolvedValue({
      _sum: { amount: "500.00" },
      _avg: { amount: "100.00" },
      _count: 5,
    } as never);
    mockGroupBy.mockResolvedValue([] as never);
    mockQueryRaw.mockResolvedValue([]);

    const res = await GET(
      new Request("http://localhost:3000/api/financials/summary")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe("500.00");
    expect(data.average).toBe("100.00");
    expect(data.count).toBe(5);
  });

  it("returns per-sub breakdown with names", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockAggregate.mockResolvedValue({
      _sum: { amount: "300.00" },
      _avg: { amount: "150.00" },
      _count: 2,
    } as never);

    // First groupBy call = per sub, second = by category
    mockGroupBy
      .mockResolvedValueOnce([
        { subId: "sub-1", _sum: { amount: "200.00" }, _count: 1 },
        { subId: null, _sum: { amount: "100.00" }, _count: 1 },
      ] as never)
      .mockResolvedValueOnce([] as never);

    mockSubFindMany.mockResolvedValue([
      { id: "sub-1", fullName: "Test Sub" },
    ] as never);
    mockQueryRaw.mockResolvedValue([]);

    const res = await GET(
      new Request("http://localhost:3000/api/financials/summary")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.perSub).toHaveLength(2);
    expect(data.perSub[0]).toEqual({
      subId: "sub-1",
      subName: "Test Sub",
      total: "200.00",
      count: 1,
    });
    expect(data.perSub[1]).toEqual({
      subId: null,
      subName: "Unlinked",
      total: "100.00",
      count: 1,
    });
  });

  it("returns category breakdown", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockAggregate.mockResolvedValue({
      _sum: { amount: "300.00" },
      _avg: { amount: "100.00" },
      _count: 3,
    } as never);

    // First groupBy = per sub, second = by category
    mockGroupBy
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
        { category: "Tribute", _sum: { amount: "200.00" }, _count: 2 },
        { category: "Tip", _sum: { amount: "100.00" }, _count: 1 },
      ] as never);

    mockQueryRaw.mockResolvedValue([]);

    const res = await GET(
      new Request("http://localhost:3000/api/financials/summary")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.byCategory).toHaveLength(2);
    expect(data.byCategory[0]).toEqual({
      category: "Tribute",
      total: "200.00",
      count: 2,
    });
  });

  it("returns trend data", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockAggregate.mockResolvedValue({
      _sum: { amount: "300.00" },
      _avg: { amount: "100.00" },
      _count: 3,
    } as never);
    mockGroupBy.mockResolvedValue([] as never);
    mockQueryRaw.mockResolvedValue([
      {
        period: new Date("2024-01-01"),
        total: 150,
        count: 2,
      },
      {
        period: new Date("2024-02-01"),
        total: 150,
        count: 1,
      },
    ]);

    const res = await GET(
      new Request("http://localhost:3000/api/financials/summary")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.trend).toHaveLength(2);
    expect(data.trend[0].total).toBe(150);
    expect(data.trend[0].count).toBe(2);
  });

  it("respects filter params", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockAggregate.mockResolvedValue({
      _sum: { amount: null },
      _avg: { amount: null },
      _count: 0,
    } as never);
    mockGroupBy.mockResolvedValue([] as never);
    mockQueryRaw.mockResolvedValue([]);

    await GET(
      new Request(
        "http://localhost:3000/api/financials/summary?category=Tribute&sub_id=sub-1"
      )
    );

    expect(mockAggregate).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId: "user-1",
        category: { in: ["Tribute"] },
        subId: "sub-1",
      }),
      _sum: { amount: true },
      _avg: { amount: true },
      _count: true,
    });
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockAggregate.mockRejectedValue(new Error("DB error"));

    const res = await GET(
      new Request("http://localhost:3000/api/financials/summary")
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
