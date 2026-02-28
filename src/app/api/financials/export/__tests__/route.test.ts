import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    financialEntry: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("papaparse", () => ({
  default: {
    unparse: vi.fn().mockReturnValue("date,amount\n2024-06-01,100"),
  },
}));

vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    internal: { pageSize: { getWidth: () => 210 } },
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    splitTextToSize: vi.fn().mockReturnValue(["text"]),
    addPage: vi.fn(),
    output: vi.fn().mockReturnValue(new ArrayBuffer(10)),
  })),
}));

import { POST } from "@/app/api/financials/export/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindMany = vi.mocked(prisma.financialEntry.findMany);

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/financials/export", {
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

describe("POST /api/financials/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(createRequest({ format: "csv" }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when user is SUB role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "SUB" },
      expires: "",
    } as never);

    const res = await POST(createRequest({ format: "csv" }));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 400 when format is invalid", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await POST(createRequest({ format: "xml" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("format");
  });

  it("returns 400 when format is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await POST(createRequest({}));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("format");
  });

  it("returns 404 when no entries match filters", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);

    const res = await POST(createRequest({ format: "csv" }));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("No matching financial entries found");
  });

  it("returns CSV with correct headers", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue(mockEntries as never);

    const res = await POST(createRequest({ format: "csv" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="financials-export.csv"'
    );
  });

  it("returns PDF with correct headers", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue(mockEntries as never);

    const res = await POST(createRequest({ format: "pdf" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="financials-export.pdf"'
    );
  });

  it("applies filter params to query", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue(mockEntries as never);

    await POST(
      createRequest({
        format: "csv",
        filters: {
          sub_id: "sub-1",
          category: ["Tribute"],
          date_from: "2024-01-01",
          date_to: "2024-12-31",
        },
      })
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          subId: "sub-1",
          category: { in: ["Tribute"] },
          date: {
            gte: new Date("2024-01-01"),
            lte: new Date("2024-12-31"),
          },
        }),
      })
    );
  });

  it("scopes query to authenticated user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue(mockEntries as never);

    await POST(createRequest({ format: "csv" }));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
        }),
      })
    );
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockRejectedValue(new Error("DB error"));

    const res = await POST(createRequest({ format: "csv" }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
