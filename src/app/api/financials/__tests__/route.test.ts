import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    financialEntry: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    subProfile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { GET, POST } from "@/app/api/financials/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindMany = vi.mocked(prisma.financialEntry.findMany);
const mockCreate = vi.mocked(prisma.financialEntry.create);
const mockSubFindUnique = vi.mocked(prisma.subProfile.findUnique);

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/financials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockEntries = [
  {
    id: "entry-1",
    userId: "user-1",
    subId: "sub-1",
    amount: "100.00",
    currency: "USD",
    category: "Tribute",
    paymentMethod: "CashApp",
    notes: "Monthly tribute",
    date: new Date("2024-06-01"),
    isInApp: true,
    createdAt: new Date("2024-06-01"),
    updatedAt: new Date("2024-06-01"),
    sub: { id: "sub-1", fullName: "Test Sub" },
  },
];

describe("GET /api/financials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost:3000/api/financials"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when user is SUB role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "SUB" },
      expires: "",
    } as never);

    const res = await GET(new Request("http://localhost:3000/api/financials"));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns empty array when no entries exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    const res = await GET(new Request("http://localhost:3000/api/financials"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("returns entries for authenticated DOMME user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue(mockEntries as never);

    const res = await GET(new Request("http://localhost:3000/api/financials"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        include: { sub: { select: { id: true, fullName: true } } },
      })
    );
  });

  it("filters by date_from and date_to", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request(
        "http://localhost:3000/api/financials?date_from=2024-01-01&date_to=2024-06-30"
      )
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          date: {
            gte: new Date("2024-01-01"),
            lte: new Date("2024-06-30"),
          },
        }),
      })
    );
  });

  it("filters by time_range preset", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request("http://localhost:3000/api/financials?time_range=week")
    );

    const call = mockFindMany.mock.calls[0][0];
    expect(call?.where).toHaveProperty("date");
    expect(
      (call?.where as Record<string, unknown>).date
    ).toHaveProperty("gte");
  });

  it("filters by sub_id", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request("http://localhost:3000/api/financials?sub_id=sub-1")
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          subId: "sub-1",
        }),
      })
    );
  });

  it("filters by sub_id=unlinked for entries without a sub", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request("http://localhost:3000/api/financials?sub_id=unlinked")
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          subId: null,
        }),
      })
    );
  });

  it("filters by category (multi-select)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request(
        "http://localhost:3000/api/financials?category=Tribute&category=Gift"
      )
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: { in: ["Tribute", "Gift"] },
        }),
      })
    );
  });

  it("filters by payment_method (multi-select)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request(
        "http://localhost:3000/api/financials?payment_method=CashApp&payment_method=Venmo"
      )
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          paymentMethod: { in: ["CashApp", "Venmo"] },
        }),
      })
    );
  });

  it("filters by is_in_app=true", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request("http://localhost:3000/api/financials?is_in_app=true")
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isInApp: true,
        }),
      })
    );
  });

  it("filters by is_in_app=false", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request("http://localhost:3000/api/financials?is_in_app=false")
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isInApp: false,
        }),
      })
    );
  });

  it("sorts by specified field and order", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request(
        "http://localhost:3000/api/financials?sort=amount&order=asc"
      )
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { amount: "asc" },
      })
    );
  });

  it("falls back to date sort for invalid sort field", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    await GET(
      new Request("http://localhost:3000/api/financials?sort=invalid")
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { date: "desc" },
      })
    );
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockRejectedValue(new Error("DB connection failed"));

    const res = await GET(new Request("http://localhost:3000/api/financials"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

describe("POST /api/financials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(
      createRequest({ amount: 100, category: "Tribute" })
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

    const res = await POST(
      createRequest({ amount: 100, category: "Tribute" })
    );
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 400 when amount is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await POST(createRequest({ category: "Tribute" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Amount");
  });

  it("returns 400 when amount is negative", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await POST(
      createRequest({ amount: -50, category: "Tribute" })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Amount");
  });

  it("returns 400 when amount is zero", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await POST(
      createRequest({ amount: 0, category: "Tribute" })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Amount");
  });

  it("returns 400 when category is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await POST(createRequest({ amount: 100 }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Category");
  });

  it("returns 404 when subId is invalid", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockSubFindUnique.mockResolvedValue(null);

    const res = await POST(
      createRequest({
        amount: 100,
        category: "Tribute",
        subId: "nonexistent",
      })
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Sub profile not found");
  });

  it("creates entry with all fields", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockSubFindUnique.mockResolvedValue({ id: "sub-1" } as never);
    mockCreate.mockResolvedValue({
      id: "entry-1",
      userId: "user-1",
      subId: "sub-1",
      amount: "100.00",
      currency: "USD",
      category: "Tribute",
      paymentMethod: "CashApp",
      notes: "Monthly",
      date: new Date("2024-06-01"),
      isInApp: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const res = await POST(
      createRequest({
        amount: 100,
        currency: "USD",
        category: "Tribute",
        paymentMethod: "CashApp",
        notes: "Monthly",
        date: "2024-06-01",
        isInApp: true,
        subId: "sub-1",
      })
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("entry-1");
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        amount: 100,
        currency: "USD",
        category: "Tribute",
        paymentMethod: "CashApp",
        notes: "Monthly",
        isInApp: true,
        subId: "sub-1",
      }),
    });
  });

  it("creates entry with minimal fields", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockCreate.mockResolvedValue({
      id: "entry-2",
      userId: "user-1",
      subId: null,
      amount: "50.00",
      currency: "USD",
      category: "Tip",
      paymentMethod: null,
      notes: null,
      date: new Date(),
      isInApp: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const res = await POST(createRequest({ amount: 50, category: "Tip" }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("entry-2");
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        amount: 50,
        category: "Tip",
        paymentMethod: null,
        notes: null,
        subId: null,
        currency: "USD",
        isInApp: true,
      }),
    });
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockCreate.mockRejectedValue(new Error("DB error"));

    const res = await POST(
      createRequest({ amount: 100, category: "Tribute" })
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
