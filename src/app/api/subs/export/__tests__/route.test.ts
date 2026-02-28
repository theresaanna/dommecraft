import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subProfile: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("papaparse", () => ({
  default: {
    unparse: vi.fn(),
  },
}));

vi.mock("jspdf", () => {
  const mockDoc = {
    internal: { pageSize: { getWidth: () => 210 } },
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    splitTextToSize: vi.fn().mockReturnValue(["line"]),
    addPage: vi.fn(),
    output: vi.fn().mockReturnValue(new ArrayBuffer(8)),
  };
  return {
    jsPDF: vi.fn().mockImplementation(() => mockDoc),
  };
});

import { POST } from "@/app/api/subs/export/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import Papa from "papaparse";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindMany = vi.mocked(prisma.subProfile.findMany);
const mockUnparse = vi.mocked(Papa.unparse);

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/subs/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockSub = {
  id: "sub-1",
  userId: "user-1",
  fullName: "Test Sub",
  contactInfo: "test@example.com",
  arrangementType: ["Online"],
  subType: ["Finsub"],
  timezone: "UTC",
  softLimits: ["limit1"],
  hardLimits: ["limit2"],
  tags: ["tag1"],
  preferences: ["pref1"],
  country: "US",
  occupation: "Engineer",
  birthday: null,
  workSchedule: null,
  financialLimits: null,
  expendableIncome: null,
  bestExperiences: null,
  worstExperiences: null,
  personalityNotes: null,
  healthNotes: null,
  obedienceHistory: null,
  privateNotes: null,
  avatarUrl: null,
  isArchived: false,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("POST /api/subs/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(
      createRequest({ subIds: ["sub-1"], format: "csv" })
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when subIds is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await POST(createRequest({ format: "csv" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("subIds must be a non-empty array");
  });

  it("returns 400 when subIds is empty", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await POST(createRequest({ subIds: [], format: "csv" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("subIds must be a non-empty array");
  });

  it("returns 400 when format is invalid", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await POST(
      createRequest({ subIds: ["sub-1"], format: "xml" })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("format must be 'pdf' or 'csv'");
  });

  it("returns 404 when no matching subs found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([]);

    const res = await POST(
      createRequest({ subIds: ["nonexistent"], format: "csv" })
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("No matching sub profiles found");
  });

  it("returns CSV with correct Content-Type", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([mockSub] as never);
    mockUnparse.mockReturnValue("fullName,contactInfo\nTest Sub,test@example.com");

    const res = await POST(
      createRequest({ subIds: ["sub-1"], format: "csv" })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="subs-export.csv"'
    );

    const text = await res.text();
    expect(text).toContain("Test Sub");
  });

  it("returns PDF with correct Content-Type", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([mockSub] as never);

    const res = await POST(
      createRequest({ subIds: ["sub-1"], format: "pdf" })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="subs-export.pdf"'
    );
  });

  it("only fetches subs belonging to the authenticated user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    mockFindMany.mockResolvedValue([mockSub] as never);
    mockUnparse.mockReturnValue("csv data");

    await POST(
      createRequest({ subIds: ["sub-1", "sub-2"], format: "csv" })
    );

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["sub-1", "sub-2"] },
        userId: "user-1",
      },
    });
  });
});
