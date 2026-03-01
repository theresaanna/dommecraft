import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ActivityPageClient from "./ActivityPageClient";

export default async function ActivityPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "DOMME") {
    redirect("/dashboard");
  }

  const userId = session.user.id;

  const [financialEntries, completedTasks, notes] = await Promise.all([
    prisma.financialEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        amount: true,
        category: true,
        createdAt: true,
        sub: { select: { fullName: true } },
      },
    }),
    prisma.task.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        completedAt: true,
        sub: { select: { fullName: true } },
      },
    }),
    prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        project: { select: { id: true, name: true } },
      },
    }),
  ]);

  const items = [
    ...financialEntries.map(
      (entry: (typeof financialEntries)[number]) => ({
        id: `fin-${entry.id}`,
        type: "financial" as const,
        title: entry.category + (entry.sub ? ` - ${entry.sub.fullName}` : ""),
        subtitle: null as string | null,
        amount: `$${parseFloat(entry.amount.toString()).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        href: "/financials",
        date: entry.createdAt.toISOString(),
      })
    ),
    ...completedTasks.map(
      (task: (typeof completedTasks)[number]) => ({
        id: `task-${task.id}`,
        type: "task" as const,
        title: task.title,
        subtitle: task.sub.fullName,
        amount: null as string | null,
        href: `/tasks/${task.id}`,
        date: (task.completedAt ?? new Date()).toISOString(),
      })
    ),
    ...notes.map(
      (note: (typeof notes)[number]) => ({
        id: `note-${note.id}`,
        type: "note" as const,
        title: note.title || "Untitled",
        subtitle: note.project.name,
        amount: null as string | null,
        href: `/hub/projects/${note.project.id}`,
        date: note.updatedAt.toISOString(),
      })
    ),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <ActivityPageClient items={items} />
    </div>
  );
}
