import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MyTaskDetailClient from "./MyTaskDetailClient";

export default async function MyTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  // Find linked profiles
  const linkedProfiles = await prisma.subProfile.findMany({
    where: { linkedUserId: session.user.id },
    select: { id: true },
  });
  const profileIds = linkedProfiles.map((p) => p.id);

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      sub: { select: { id: true, fullName: true } },
      subtasks: { orderBy: { sortOrder: "asc" } },
      proofs: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!task || !profileIds.includes(task.subId)) {
    redirect("/my-tasks");
  }

  // Serialize
  const serializedTask = {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    deadline: task.deadline?.toISOString() || null,
    tags: task.tags,
    sub: task.sub,
    completedAt: task.completedAt?.toISOString() || null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    subtasks: task.subtasks.map((s) => ({
      id: s.id,
      title: s.title,
      isCompleted: s.isCompleted,
      sortOrder: s.sortOrder,
    })),
    proofs: task.proofs.map((p) => ({
      id: p.id,
      fileUrl: p.fileUrl,
      fileType: p.fileType,
      mimeType: p.mimeType,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
    })),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <MyTaskDetailClient task={serializedTask} />
    </div>
  );
}
