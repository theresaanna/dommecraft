import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

type CreateNotificationParams = {
  userId: string;
  type: NotificationType;
  message: string;
  linkUrl?: string;
  taskId?: string;
  calendarEventId?: string;
};

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      message: params.message,
      linkUrl: params.linkUrl ?? null,
      taskId: params.taskId ?? null,
      calendarEventId: params.calendarEventId ?? null,
    },
  });
}
