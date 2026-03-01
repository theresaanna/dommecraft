import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CalendarPageClient from "./CalendarPageClient";

const VIEW_MAP: Record<string, "month-grid" | "week" | "day"> = {
  MONTH: "month-grid",
  WEEK: "week",
  DAY: "day",
};

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "DOMME") {
    redirect("/dashboard");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { calendarDefaultView: true },
  });

  const defaultView = VIEW_MAP[user?.calendarDefaultView ?? "MONTH"];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <CalendarPageClient defaultView={defaultView} />
    </div>
  );
}
