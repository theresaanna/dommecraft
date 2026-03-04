import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MyTasksPageClient from "../my-tasks/MyTasksPageClient";

export default async function SubTasksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (session.user.role !== "DOMME") redirect("/my-tasks");

  // Find SubProfiles linked to this user
  const linkedProfiles = await prisma.subProfile.findMany({
    where: { linkedUserId: session.user.id },
    select: { id: true },
  });

  const profileIds = linkedProfiles.map((p: (typeof linkedProfiles)[number]) => p.id);

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
  const serializedTasks = tasks.map((t: (typeof tasks)[number]) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    declineReason: t.declineReason,
    deadline: t.deadline?.toISOString() || null,
    tags: t.tags,
    sub: t.sub,
    subtaskCount: t._count.subtasks,
    proofCount: t._count.proofs,
    completedSubtasks: t.subtasks.filter((s: (typeof t.subtasks)[number]) => s.isCompleted).length,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <MyTasksPageClient
        tasks={serializedTasks}
        hasLinkedProfile={profileIds.length > 0}
        title="Sub Tasks"
        subtitle="Tasks assigned to your subs"
        basePath="/sub-tasks"
      />
    </div>
  );
}
