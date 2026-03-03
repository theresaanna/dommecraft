import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findUnique: vi.fn() },
    projectTask: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    calendarEvent: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { GET, POST } from "@/app/api/hub/projects/[id]/tasks/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockProjectFindUnique = vi.mocked(prisma.project.findUnique);
const mockTaskFindMany = vi.mocked(prisma.projectTask.findMany);
const mockTaskFindFirst = vi.mocked(prisma.projectTask.findFirst);
const mockTaskCreate = vi.mocked(prisma.projectTask.create);
const mockTransaction = vi.mocked(prisma.$transaction);

const params = Promise.resolve({ id: "proj-1" });

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/hub/projects/proj-1/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/hub/projects/[id]/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost:3000/api/hub/projects/proj-1/tasks"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is SUB role", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "SUB" }, expires: "" } as never);
    const res = await GET(new Request("http://localhost:3000/api/hub/projects/proj-1/tasks"), { params });
    expect(res.status).toBe(403);
  });

  it("returns 404 when project not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockProjectFindUnique.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost:3000/api/hub/projects/proj-1/tasks"), { params });
    expect(res.status).toBe(404);
  });

  it("returns tasks ordered by sortOrder", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockProjectFindUnique.mockResolvedValue({ id: "proj-1" } as never);
    mockTaskFindMany.mockResolvedValue([
      { id: "task-1", title: "First", sortOrder: 0 },
      { id: "task-2", title: "Second", sortOrder: 1 },
    ] as never);

    const res = await GET(new Request("http://localhost:3000/api/hub/projects/proj-1/tasks"), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].title).toBe("First");
    expect(mockTaskFindMany).toHaveBeenCalledWith({
      where: { projectId: "proj-1" },
      orderBy: { sortOrder: "asc" },
    });
  });

  it("returns empty array when no tasks exist", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockProjectFindUnique.mockResolvedValue({ id: "proj-1" } as never);
    mockTaskFindMany.mockResolvedValue([]);

    const res = await GET(new Request("http://localhost:3000/api/hub/projects/proj-1/tasks"), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockProjectFindUnique.mockRejectedValue(new Error("DB error"));

    const res = await GET(new Request("http://localhost:3000/api/hub/projects/proj-1/tasks"), { params });
    expect(res.status).toBe(500);
  });
});

describe("POST /api/hub/projects/[id]/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(createRequest({ title: "Task" }), { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is SUB role", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "SUB" }, expires: "" } as never);
    const res = await POST(createRequest({ title: "Task" }), { params });
    expect(res.status).toBe(403);
  });

  it("returns 404 when project not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockProjectFindUnique.mockResolvedValue(null);
    const res = await POST(createRequest({ title: "Task" }), { params });
    expect(res.status).toBe(404);
  });

  it("returns 400 when title is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockProjectFindUnique.mockResolvedValue({ id: "proj-1" } as never);
    const res = await POST(createRequest({}), { params });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("Title");
  });

  it("returns 400 when title is empty string", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockProjectFindUnique.mockResolvedValue({ id: "proj-1" } as never);
    const res = await POST(createRequest({ title: "  " }), { params });
    expect(res.status).toBe(400);
  });

  it("creates task without deadline", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockProjectFindUnique.mockResolvedValue({ id: "proj-1" } as never);
    mockTaskFindFirst.mockResolvedValue(null);
    mockTaskCreate.mockResolvedValue({
      id: "task-1",
      userId: "user-1",
      projectId: "proj-1",
      title: "Buy supplies",
      completed: false,
      deadline: null,
      sortOrder: 0,
      calendarEventId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const res = await POST(createRequest({ title: "Buy supplies" }), { params });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.title).toBe("Buy supplies");
    expect(mockTaskCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        projectId: "proj-1",
        title: "Buy supplies",
        deadline: null,
        sortOrder: 0,
      }),
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("creates task with deadline and calendar event via transaction", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockProjectFindUnique.mockResolvedValue({ id: "proj-1" } as never);
    mockTaskFindFirst.mockResolvedValue({ sortOrder: 2 } as never);

    const mockTask = {
      id: "task-1",
      title: "Plan session",
      completed: false,
      deadline: new Date("2024-07-15"),
      sortOrder: 3,
      calendarEventId: "evt-1",
    };
    mockTransaction.mockImplementation(async (fn) => {
      if (typeof fn === "function") {
        return fn(prisma);
      }
      return [];
    });
    // Mock the calls that happen inside the transaction
    vi.mocked(prisma.calendarEvent.create).mockResolvedValue({
      id: "evt-1",
      title: "TASK: Plan session",
      startAt: new Date("2024-07-15"),
      isAllDay: true,
      sourceType: "PROJECT_TASK",
    } as never);
    mockTaskCreate.mockResolvedValue(mockTask as never);

    const res = await POST(
      createRequest({ title: "Plan session", deadline: "2024-07-15" }),
      { params }
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.title).toBe("Plan session");
    expect(data.calendarEventId).toBe("evt-1");
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("computes sortOrder as max + 1", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockProjectFindUnique.mockResolvedValue({ id: "proj-1" } as never);
    mockTaskFindFirst.mockResolvedValue({ sortOrder: 5 } as never);
    mockTaskCreate.mockResolvedValue({
      id: "task-1",
      title: "Task",
      sortOrder: 6,
    } as never);

    await POST(createRequest({ title: "Task" }), { params });

    expect(mockTaskCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ sortOrder: 6 }),
    });
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockProjectFindUnique.mockResolvedValue({ id: "proj-1" } as never);
    mockTaskFindFirst.mockRejectedValue(new Error("DB error"));

    const res = await POST(createRequest({ title: "Task" }), { params });
    expect(res.status).toBe(500);
  });
});
