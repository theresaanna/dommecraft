import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditCalendarEventClient from "./EditCalendarEventClient";

export default async function EditCalendarEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "DOMME") {
    redirect("/dashboard");
  }

  const { id } = await params;

  const event = await prisma.calendarEvent.findUnique({
    where: { id, userId: session.user.id },
  });

  if (!event || event.sourceType !== "STANDALONE") {
    notFound();
  }

  function formatDateTime(date: Date, isAllDay: boolean): string {
    if (isAllDay) {
      return date.toISOString().split("T")[0];
    }
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    const h = String(date.getUTCHours()).padStart(2, "0");
    const min = String(date.getUTCMinutes()).padStart(2, "0");
    return `${y}-${m}-${d} ${h}:${min}`;
  }

  const serializedEvent = {
    id: event.id,
    originalEventId: event.id,
    title: event.title,
    description: event.description,
    start: formatDateTime(event.startAt, event.isAllDay),
    end: event.endAt
      ? formatDateTime(event.endAt, event.isAllDay)
      : formatDateTime(event.startAt, event.isAllDay),
    isAllDay: event.isAllDay,
    calendarId: event.color || "standalone",
    sourceType: event.sourceType,
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <EditCalendarEventClient event={serializedEvent} />
    </div>
  );
}
