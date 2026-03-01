import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    calendarEvent: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { PATCH, DELETE } from "@/app/api/calendar/events/[id]/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindUnique = vi.mocked(prisma.calendarEvent.findUnique);
const mockUpdate = vi.mocked(prisma.calendarEvent.update);
const mockDelete = vi.mocked(prisma.calendarEvent.delete);

function resolveParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/calendar/events/evt-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/calendar/events/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await PATCH(
      createRequest({ title: "Updated" }),
      resolveParams("evt-1")
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
      createRequest({ title: "Updated" }),
      resolveParams("evt-1")
    );
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 404 when event not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue(null);

    const res = await PATCH(
      createRequest({ title: "Updated" }),
      resolveParams("nonexistent")
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Calendar event not found");
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "nonexistent", userId: "user-1" },
      select: { id: true, sourceType: true },
    });
  });

  it("returns 400 when event is TASK source type", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "evt-1",
      sourceType: "TASK",
    } as never);

    const res = await PATCH(
      createRequest({ title: "Updated" }),
      resolveParams("evt-1")
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Cannot directly modify");
  });

  it("returns 400 when event is REMINDER source type", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "evt-1",
      sourceType: "REMINDER",
    } as never);

    const res = await PATCH(
      createRequest({ title: "Updated" }),
      resolveParams("evt-1")
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Cannot directly modify");
  });

  it("updates event with partial fields", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "evt-1",
      sourceType: "STANDALONE",
    } as never);
    mockUpdate.mockResolvedValue({
      id: "evt-1",
      title: "Updated Title",
    } as never);

    const res = await PATCH(
      createRequest({ title: "Updated Title" }),
      resolveParams("evt-1")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.title).toBe("Updated Title");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "evt-1" },
      data: { title: "Updated Title" },
    });
  });

  it("updates multiple fields at once", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "evt-1",
      sourceType: "STANDALONE",
    } as never);
    mockUpdate.mockResolvedValue({
      id: "evt-1",
      title: "New Title",
      description: "New desc",
      color: "#ff0000",
    } as never);

    const res = await PATCH(
      createRequest({
        title: "New Title",
        description: "New desc",
        color: "#ff0000",
      }),
      resolveParams("evt-1")
    );

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "evt-1" },
      data: {
        title: "New Title",
        description: "New desc",
        color: "#ff0000",
      },
    });
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "evt-1",
      sourceType: "STANDALONE",
    } as never);
    mockUpdate.mockRejectedValue(new Error("DB error"));

    const res = await PATCH(
      createRequest({ title: "Updated" }),
      resolveParams("evt-1")
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

describe("DELETE /api/calendar/events/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await DELETE(
      new Request("http://localhost:3000/api/calendar/events/evt-1", {
        method: "DELETE",
      }),
      resolveParams("evt-1")
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
      new Request("http://localhost:3000/api/calendar/events/evt-1", {
        method: "DELETE",
      }),
      resolveParams("evt-1")
    );
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 404 when event not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue(null);

    const res = await DELETE(
      new Request("http://localhost:3000/api/calendar/events/nonexistent", {
        method: "DELETE",
      }),
      resolveParams("nonexistent")
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Calendar event not found");
  });

  it("returns 400 when event is TASK source type", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "evt-1",
      sourceType: "TASK",
    } as never);

    const res = await DELETE(
      new Request("http://localhost:3000/api/calendar/events/evt-1", {
        method: "DELETE",
      }),
      resolveParams("evt-1")
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Cannot directly delete");
  });

  it("deletes standalone event successfully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "evt-1",
      sourceType: "STANDALONE",
    } as never);
    mockDelete.mockResolvedValue({} as never);

    const res = await DELETE(
      new Request("http://localhost:3000/api/calendar/events/evt-1", {
        method: "DELETE",
      }),
      resolveParams("evt-1")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "evt-1" } });
  });

  it("scopes ownership check to userId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "evt-1",
      sourceType: "STANDALONE",
    } as never);
    mockDelete.mockResolvedValue({} as never);

    await DELETE(
      new Request("http://localhost:3000/api/calendar/events/evt-1", {
        method: "DELETE",
      }),
      resolveParams("evt-1")
    );

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "evt-1", userId: "user-1" },
      select: { id: true, sourceType: true },
    });
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "evt-1",
      sourceType: "STANDALONE",
    } as never);
    mockDelete.mockRejectedValue(new Error("DB error"));

    const res = await DELETE(
      new Request("http://localhost:3000/api/calendar/events/evt-1", {
        method: "DELETE",
      }),
      resolveParams("evt-1")
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
