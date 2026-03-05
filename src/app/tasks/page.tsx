import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import TasksPageClient from "./TasksPageClient";

type SearchParams = {
  status?: string;
  priority?: string;
  sub_id?: string;
  project_id?: string;
  deadline_from?: string;
  deadline_to?: string;
  sort?: string;
  order?: string;
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "DOMME") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const status = params.status || "";
  const priority = params.priority || "";
  const subId = params.sub_id || "";
  const projectId = params.project_id || "";
  const deadlineFrom = params.deadline_from || "";
  const deadlineTo = params.deadline_to || "";
  const sort = params.sort || "createdAt";
  const order = params.order || "desc";

  // Build where clause
  const where: Prisma.TaskWhereInput = {
    userId: session.user.id,
  };

  if (status) {
    where.status = status as Prisma.EnumTaskStatusFilter;
  }

  if (priority) {
    where.priority = priority as Prisma.EnumTaskPriorityFilter;
  }

  if (subId) {
    where.subId = subId;
  }

  if (projectId) {
    where.projectId = projectId;
  }

  if (deadlineFrom || deadlineTo) {
    where.deadline = {
      ...(deadlineFrom && { gte: new Date(deadlineFrom) }),
      ...(deadlineTo && { lte: new Date(deadlineTo) }),
    };
  }

  const validSortFields = ["deadline", "priority", "createdAt", "title"];
  const sortField = validSortFields.includes(sort) ? sort : "createdAt";
  const sortOrder = order === "asc" ? "asc" : "desc";

  // Fetch tasks
  const tasks = await prisma.task.findMany({
    where,
    orderBy: { [sortField]: sortOrder },
    include: {
      sub: {
        select: { id: true, fullName: true, color: true },
      },
      project: {
        select: { id: true, name: true },
      },
      _count: {
        select: { subtasks: true, proofs: true },
      },
      subtasks: {
        select: { isCompleted: true },
      },
    },
  });

  // Fetch available subs for filter dropdown and form
  const availableSubs = await prisma.subProfile.findMany({
    where: { userId: session.user.id, isArchived: false },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  // Fetch available projects for filter dropdown and form
  const availableProjects = await prisma.project.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Serialize dates to ISO strings
  const serializedTasks = tasks.map((task: (typeof tasks)[number]) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    tags: task.tags,
    deadline: task.deadline?.toISOString() ?? null,
    priority: task.priority,
    status: task.status,
    declineReason: task.declineReason,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    sub: task.sub,
    project: task.project,
    _count: task._count,
    subtasks: task.subtasks,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Sub Tasks
          </h1>
          <p className="mt-1 text-base text-zinc-500 dark:text-zinc-400">
            Assign and track tasks for your subs.
          </p>
        </div>
        <Link
          href="/tasks/new"
          className="rounded-md bg-sky-300/30 backdrop-blur-sm border border-sky-400/30 px-4 py-2 text-base font-medium text-sky-900 hover:bg-sky-300/45 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] transition-all dark:border-[rgba(55,113,200,0.35)] dark:bg-[rgba(55,113,200,0.25)] dark:text-blue-100 dark:hover:bg-[rgba(55,113,200,0.4)] dark:hover:shadow-[0_0_20px_rgba(55,113,200,0.5)]"
        >
          New Sub Task
        </Link>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white/40 backdrop-blur-sm p-8 dark:border-zinc-800 dark:bg-zinc-950/60">
        <TasksPageClient
          initialTasks={serializedTasks}
          availableSubs={availableSubs}
          availableProjects={availableProjects}
          currentParams={{
            status,
            priority,
            sub_id: subId,
            project_id: projectId,
            deadline_from: deadlineFrom,
            deadline_to: deadlineTo,
            sort: sortField,
            order: sortOrder,
          }}
        />
      </div>
    </div>
  );
}
