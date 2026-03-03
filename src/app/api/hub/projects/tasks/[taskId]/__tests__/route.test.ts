import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectTask: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    calendarEvent: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { PATCH, DELETE } from "@/app/api/hub/projects/tasks/[taskId]/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockTaskFindUnique = vi.mocked(prisma.projectTask.findUnique);
const mockTaskUpdate = vi.mocked(prisma.projectTask.update);
const mockTaskDelete = vi.mocked(prisma.projectTask.delete);
const mockEventCreate = vi.mocked(prisma.calendarEvent.create);
const mockEventUpdate = vi.mocked(prisma.calendarEvent.update);
const mockEventDelete = vi.mocked(prisma.calendarEvent.delete);
const mockTransaction = vi.mocked(prisma.$transaction);

const params = Promise.resolve({ taskId: "task-1" });

function createRequest(body: Record<string, unknown>, method = "PATCH") {
  return new Request("http://localhost:3000/api/hub/projects/tasks/task-1", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/hub/projects/tasks/[taskId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (fn) => {
      if (typeof fn === "function") {
        return fn(prisma);
      }
      return [];
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(createRequest({ completed: true }), { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is SUB role", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "SUB" }, expires: "" } as never);
    const res = await PATCH(createRequest({ completed: true }), { params });
    expect(res.status).toBe(403);
  });

  it("returns 404 when task not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockTaskFindUnique.mockResolvedValue(null);
    const res = await PATCH(createRequest({ completed: true }), { params });
    expect(res.status).toBe(404);
  });

  it("toggles completed status", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockTaskFindUnique.mockResolvedValue({
      id: "task-1",
      title: "Buy supplies",
      deadline: null,
      calendarEventId: null,
    } as never);
    mockTaskUpdate.mockResolvedValue({
      id: "task-1",
      title: "Buy supplies",
      completed: true,
    } as never);

    const res = await PATCH(createRequest({ completed: true }), { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.completed).toBe(true);
    expect(mockTaskUpdate).toHaveBeenCalledWith({
      where: { id: "task-1" },
      data: { completed: true },
    });
  });

  it("updates title only", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockTaskFindUnique.mockResolvedValue({
      id: "task-1",
      title: "Old title",
      deadline: null,
      calendarEventId: null,
    } as never);
    mockTaskUpdate.mockResolvedValue({
      id: "task-1",
      title: "New title",
    } as never);

    const res = await PATCH(createRequest({ title: "New title" }), { params });
    expect(res.status).toBe(200);
    expect(mockTaskUpdate).toHaveBeenCalledWith({
      where: { id: "task-1" },
      data: { title: "New title" },
    });
  });

  it("sets deadline and creates calendar event", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockTaskFindUnique.mockResolvedValue({
      id: "task-1",
      title: "Plan session",
      deadline: null,
      calendarEventId: null,
    } as never);
    mockEventCreate.mockResolvedValue({
      id: "evt-1",
      title: "TASK: Plan session",
    } as never);
    mockTaskUpdate.mockResolvedValue({
      id: "task-1",
      title: "Plan session",
      deadline: new Date("2024-07-15"),
      calendarEventId: "evt-1",
    } as never);

    const res = await PATCH(
      createRequest({ deadline: "2024-07-15" }),
      { params }
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.calendarEventId).toBe("evt-1");
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "TASK: Plan session",
        isAllDay: true,
        sourceType: "PROJECT_TASK",
      }),
    });
  });

  it("changes deadline and updates calendar event", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockTaskFindUnique.mockResolvedValue({
      id: "task-1",
      title: "Plan session",
      deadline: new Date("2024-07-15"),
      calendarEventId: "evt-1",
    } as never);
    mockEventUpdate.mockResolvedValue({} as never);
    mockTaskUpdate.mockResolvedValue({
      id: "task-1",
      deadline: new Date("2024-08-01"),
      calendarEventId: "evt-1",
    } as never);

    const res = await PATCH(
      createRequest({ deadline: "2024-08-01" }),
      { params }
    );

    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockEventUpdate).toHaveBeenCalledWith({
      where: { id: "evt-1" },
      data: expect.objectContaining({
        title: "TASK: Plan session",
      }),
    });
  });

  it("removes deadline and deletes calendar event", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockTaskFindUnique.mockResolvedValue({
      id: "task-1",
      title: "Plan session",
      deadline: new Date("2024-07-15"),
      calendarEventId: "evt-1",
    } as never);
    mockEventDelete.mockResolvedValue({} as never);
    mockTaskUpdate.mockResolvedValue({
      id: "task-1",
      deadline: null,
      calendarEventId: null,
    } as never);

    const res = await PATCH(
      createRequest({ deadline: null }),
      { params }
    );

    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockEventDelete).toHaveBeenCalledWith({
      where: { id: "evt-1" },
    });
  });

  it("updates title on task with calendar event", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockTaskFindUnique.mockResolvedValue({
      id: "task-1",
      title: "Old title",
      deadline: new Date("2024-07-15"),
      calendarEventId: "evt-1",
    } as never);
    mockEventUpdate.mockResolvedValue({} as never);
    mockTaskUpdate.mockResolvedValue({
      id: "task-1",
      title: "New title",
    } as never);

    const res = await PATCH(
      createRequest({ title: "New title" }),
      { params }
    );

    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockEventUpdate).toHaveBeenCalledWith({
      where: { id: "evt-1" },
      data: expect.objectContaining({
        title: "TASK: New title",
      }),
    });
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockTaskFindUnique.mockRejectedValue(new Error("DB error"));
    const res = await PATCH(createRequest({ completed: true }), { params });
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/hub/projects/tasks/[taskId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(
      new Request("http://localhost:3000/api/hub/projects/tasks/task-1", { method: "DELETE" }),
      { params }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is SUB role", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "SUB" }, expires: "" } as never);
    const res = await DELETE(
      new Request("http://localhost:3000/api/hub/projects/tasks/task-1", { method: "DELETE" }),
      { params }
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when task not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockTaskFindUnique.mockResolvedValue(null);
    const res = await DELETE(
      new Request("http://localhost:3000/api/hub/projects/tasks/task-1", { method: "DELETE" }),
      { params }
    );
    expect(res.status).toBe(404);
  });

  it("deletes task without calendar event", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockTaskFindUnique.mockResolvedValue({
      id: "task-1",
      calendarEventId: null,
    } as never);
    mockTaskDelete.mockResolvedValue({} as never);

    const res = await DELETE(
      new Request("http://localhost:3000/api/hub/projects/tasks/task-1", { method: "DELETE" }),
      { params }
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockTaskDelete).toHaveBeenCalledWith({ where: { id: "task-1" } });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("deletes task with calendar event via transaction", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockTaskFindUnique.mockResolvedValue({
      id: "task-1",
      calendarEventId: "evt-1",
    } as never);
    mockTransaction.mockResolvedValue([{}, {}] as never);

    const res = await DELETE(
      new Request("http://localhost:3000/api/hub/projects/tasks/task-1", { method: "DELETE" }),
      { params }
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "DOMME" }, expires: "" } as never);
    mockTaskFindUnique.mockRejectedValue(new Error("DB error"));

    const res = await DELETE(
      new Request("http://localhost:3000/api/hub/projects/tasks/task-1", { method: "DELETE" }),
      { params }
    );
    expect(res.status).toBe(500);
  });
});
