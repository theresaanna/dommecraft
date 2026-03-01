import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NotificationsPageClient from "./NotificationsPageClient";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serialized = notifications.map((n: (typeof notifications)[number]) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    linkUrl: n.linkUrl,
    isRead: n.isRead,
    taskId: n.taskId,
    calendarEventId: n.calendarEventId,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <NotificationsPageClient notifications={serialized} />
    </div>
  );
}
