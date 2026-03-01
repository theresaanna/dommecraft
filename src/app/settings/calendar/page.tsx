import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CalendarSettingsClient from "./CalendarSettingsClient";

export default async function CalendarSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "DOMME") {
    redirect("/dashboard");
  }

  const externalCalendars = await prisma.externalCalendar.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      provider: true,
      isActive: true,
      lastSyncAt: true,
      createdAt: true,
    },
  });

  const serialized = externalCalendars.map((cal) => ({
    id: cal.id,
    provider: cal.provider,
    isActive: cal.isActive,
    lastSyncAt: cal.lastSyncAt?.toISOString() ?? null,
    createdAt: cal.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <CalendarSettingsClient calendars={serialized} />
    </div>
  );
}
