import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    financialEntry: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    subProfile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { PATCH, DELETE } from "@/app/api/financials/[id]/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindUnique = vi.mocked(prisma.financialEntry.findUnique);
const mockUpdate = vi.mocked(prisma.financialEntry.update);
const mockDelete = vi.mocked(prisma.financialEntry.delete);
const mockSubFindUnique = vi.mocked(prisma.subProfile.findUnique);

function resolveParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/financials/entry-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/financials/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await PATCH(
      createRequest({ amount: 200 }),
      resolveParams("entry-1")
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

    const res = await PATCH(
      createRequest({ amount: 200 }),
      resolveParams("entry-1")
    );
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 404 when entry not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue(null);

    const res = await PATCH(
      createRequest({ amount: 200 }),
      resolveParams("nonexistent")
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Financial entry not found");
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "nonexistent", userId: "user-1" },
      select: { id: true },
    });
  });

  it("updates entry with partial fields", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({ id: "entry-1" } as never);
    mockUpdate.mockResolvedValue({
      id: "entry-1",
      amount: "200.00",
      category: "Tribute",
    } as never);

    const res = await PATCH(
      createRequest({ amount: 200 }),
      resolveParams("entry-1")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.amount).toBe("200.00");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "entry-1" },
      data: { amount: 200 },
    });
  });

  it("updates multiple fields at once", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({ id: "entry-1" } as never);
    mockUpdate.mockResolvedValue({
      id: "entry-1",
      amount: "300.00",
      category: "Gift",
      notes: "Updated",
    } as never);

    const res = await PATCH(
      createRequest({ amount: 300, category: "Gift", notes: "Updated" }),
      resolveParams("entry-1")
    );

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "entry-1" },
      data: { amount: 300, category: "Gift", notes: "Updated" },
    });
  });

  it("validates sub ownership when subId is changed", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({ id: "entry-1" } as never);
    mockSubFindUnique.mockResolvedValue(null);

    const res = await PATCH(
      createRequest({ subId: "bad-sub" }),
      resolveParams("entry-1")
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Sub profile not found");
  });

  it("allows setting subId to null", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({ id: "entry-1" } as never);
    mockUpdate.mockResolvedValue({ id: "entry-1", subId: null } as never);

    const res = await PATCH(
      createRequest({ subId: null }),
      resolveParams("entry-1")
    );

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "entry-1" },
      data: { subId: null },
    });
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({ id: "entry-1" } as never);
    mockUpdate.mockRejectedValue(new Error("DB error"));

    const res = await PATCH(
      createRequest({ amount: 200 }),
      resolveParams("entry-1")
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

describe("DELETE /api/financials/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await DELETE(
      new Request("http://localhost:3000/api/financials/entry-1", {
        method: "DELETE",
      }),
      resolveParams("entry-1")
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

    const res = await DELETE(
      new Request("http://localhost:3000/api/financials/entry-1", {
        method: "DELETE",
      }),
      resolveParams("entry-1")
    );
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 404 when entry not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue(null);

    const res = await DELETE(
      new Request("http://localhost:3000/api/financials/nonexistent", {
        method: "DELETE",
      }),
      resolveParams("nonexistent")
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Financial entry not found");
  });

  it("hard deletes the entry", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({ id: "entry-1" } as never);
    mockDelete.mockResolvedValue({} as never);

    const res = await DELETE(
      new Request("http://localhost:3000/api/financials/entry-1", {
        method: "DELETE",
      }),
      resolveParams("entry-1")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "entry-1" } });
  });

  it("scopes ownership check to userId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({ id: "entry-1" } as never);
    mockDelete.mockResolvedValue({} as never);

    await DELETE(
      new Request("http://localhost:3000/api/financials/entry-1", {
        method: "DELETE",
      }),
      resolveParams("entry-1")
    );

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "entry-1", userId: "user-1" },
      select: { id: true },
    });
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({ id: "entry-1" } as never);
    mockDelete.mockRejectedValue(new Error("DB error"));

    const res = await DELETE(
      new Request("http://localhost:3000/api/financials/entry-1", {
        method: "DELETE",
      }),
      resolveParams("entry-1")
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
