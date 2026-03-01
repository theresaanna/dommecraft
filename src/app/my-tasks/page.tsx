import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MyTasksPageClient from "./MyTasksPageClient";

export default async function MyTasksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Find SubProfiles linked to this user
  const linkedProfiles = await prisma.subProfile.findMany({
    where: { linkedUserId: session.user.id },
    select: { id: true },
  });

  const profileIds = linkedProfiles.map((p) => p.id);

  const tasks = profileIds.length > 0
    ? await prisma.task.findMany({
        where: {
          subId: { in: profileIds },
          status: { not: "ARCHIVED" },
        },
        orderBy: [
          { deadline: { sort: "asc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        include: {
          sub: { select: { id: true, fullName: true } },
          _count: { select: { subtasks: true, proofs: true } },
          subtasks: { select: { isCompleted: true } },
        },
      })
    : [];

  // Serialize dates
  const serializedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    deadline: t.deadline?.toISOString() || null,
    tags: t.tags,
    sub: t.sub,
    subtaskCount: t._count.subtasks,
    proofCount: t._count.proofs,
    completedSubtasks: t.subtasks.filter((s) => s.isCompleted).length,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <MyTasksPageClient
        tasks={serializedTasks}
        hasLinkedProfile={profileIds.length > 0}
      />
    </div>
  );
}
