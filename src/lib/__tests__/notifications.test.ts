import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      create: vi.fn(),
    },
  },
}));

import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const mockCreate = vi.mocked(prisma.notification.create);

describe("createNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a notification with all fields", async () => {
    mockCreate.mockResolvedValue({
      id: "notif-1",
      userId: "user-1",
      type: "SUB_JOINED",
      message: "Sub joined",
      linkUrl: "/subs/sub-1",
      isRead: false,
      taskId: null,
      calendarEventId: null,
      createdAt: new Date(),
    });

    const result = await createNotification({
      userId: "user-1",
      type: "SUB_JOINED",
      message: "Sub joined",
      linkUrl: "/subs/sub-1",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: "SUB_JOINED",
        message: "Sub joined",
        linkUrl: "/subs/sub-1",
        taskId: null,
        calendarEventId: null,
      },
    });
    expect(result.id).toBe("notif-1");
  });

  it("creates a notification with taskId", async () => {
    mockCreate.mockResolvedValue({
      id: "notif-2",
      userId: "user-1",
      type: "TASK_ASSIGNED",
      message: "New task",
      linkUrl: "/my-tasks/task-1",
      isRead: false,
      taskId: "task-1",
      calendarEventId: null,
      createdAt: new Date(),
    });

    await createNotification({
      userId: "user-1",
      type: "TASK_ASSIGNED",
      message: "New task",
      linkUrl: "/my-tasks/task-1",
      taskId: "task-1",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        taskId: "task-1",
        calendarEventId: null,
      }),
    });
  });

  it("creates a notification with calendarEventId", async () => {
    mockCreate.mockResolvedValue({
      id: "notif-3",
      userId: "user-1",
      type: "CALENDAR_REMINDER",
      message: "Upcoming event",
      linkUrl: "/calendar",
      isRead: false,
      taskId: null,
      calendarEventId: "evt-1",
      createdAt: new Date(),
    });

    await createNotification({
      userId: "user-1",
      type: "CALENDAR_REMINDER",
      message: "Upcoming event",
      linkUrl: "/calendar",
      calendarEventId: "evt-1",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        calendarEventId: "evt-1",
        taskId: null,
      }),
    });
  });

  it("defaults optional fields to null", async () => {
    mockCreate.mockResolvedValue({
      id: "notif-4",
      userId: "user-1",
      type: "TASK_ASSIGNED",
      message: "Task",
      linkUrl: null,
      isRead: false,
      taskId: null,
      calendarEventId: null,
      createdAt: new Date(),
    });

    await createNotification({
      userId: "user-1",
      type: "TASK_ASSIGNED",
      message: "Task",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: "TASK_ASSIGNED",
        message: "Task",
        linkUrl: null,
        taskId: null,
        calendarEventId: null,
      },
    });
  });
});
