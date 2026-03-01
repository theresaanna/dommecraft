import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TaskDetailClient from "./TaskDetailClient";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "DOMME") redirect("/dashboard");

  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id, userId: session.user.id },
    include: {
      sub: { select: { id: true, fullName: true } },
      project: { select: { id: true, name: true } },
      subtasks: { orderBy: { sortOrder: "asc" } },
      proofs: { orderBy: { createdAt: "desc" } },
      dependsOn: {
        include: {
          dependsOn: {
            select: { id: true, title: true, status: true },
          },
        },
      },
      dependedOnBy: {
        include: {
          task: { select: { id: true, title: true, status: true } },
        },
      },
    },
  });

  if (!task) redirect("/tasks");

  // Fetch available tasks for dependency selector (exclude current task)
  const availableTasks = await prisma.task.findMany({
    where: { userId: session.user.id, id: { not: id } },
    select: { id: true, title: true, status: true },
    orderBy: { title: "asc" },
  });

  const availableProjects = await prisma.project.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Serialize dates, pass to client
  const serializedTask = {
    id: task.id,
    title: task.title,
    description: task.description,
    tags: task.tags,
    deadline: task.deadline?.toISOString() ?? null,
    priority: task.priority,
    status: task.status,
    completedAt: task.completedAt?.toISOString() ?? null,
    recurrenceRule: task.recurrenceRule,
    recurrenceEndDate: task.recurrenceEndDate?.toISOString() ?? null,
    reminderOffset: task.reminderOffset,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    sub: task.sub,
    project: task.project,
    subtasks: task.subtasks.map((st: (typeof task.subtasks)[number]) => ({
      id: st.id,
      title: st.title,
      isCompleted: st.isCompleted,
      sortOrder: st.sortOrder,
      createdAt: st.createdAt.toISOString(),
      updatedAt: st.updatedAt.toISOString(),
    })),
    proofs: task.proofs.map((p: (typeof task.proofs)[number]) => ({
      id: p.id,
      fileUrl: p.fileUrl,
      fileType: p.fileType,
      mimeType: p.mimeType,
      fileSize: p.fileSize,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
    })),
    dependsOn: task.dependsOn.map((d: (typeof task.dependsOn)[number]) => ({
      id: d.id,
      dependsOn: d.dependsOn,
    })),
    dependedOnBy: task.dependedOnBy.map((d: (typeof task.dependedOnBy)[number]) => ({
      id: d.id,
      task: d.task,
    })),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <TaskDetailClient
        task={serializedTask}
        availableTasks={availableTasks}
        availableProjects={availableProjects}
      />
    </div>
  );
}
