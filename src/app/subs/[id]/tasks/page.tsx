import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  MEDIUM:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  HIGH: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_STYLES: Record<string, string> = {
  NOT_STARTED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  IN_PROGRESS:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SUBMITTED:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  COMPLETED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  ARCHIVED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
};

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

const OPEN_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED"] as const;

function isOverdue(deadline: Date | null, status: string): boolean {
  if (!deadline) return false;
  if (status === "COMPLETED" || status === "ARCHIVED") return false;
  return deadline < new Date();
}

export default async function SubTasksPage({
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

  const tasks = await prisma.task.findMany({
    where: { subId: id, userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { id: true, name: true } },
      _count: { select: { subtasks: true, proofs: true } },
      subtasks: { select: { isCompleted: true } },
    },
  });

  const openTasks = tasks.filter((t) =>
    OPEN_STATUSES.includes(t.status as (typeof OPEN_STATUSES)[number])
  );
  const closedTasks = tasks.filter(
    (t) =>
      !OPEN_STATUSES.includes(t.status as (typeof OPEN_STATUSES)[number])
  );

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Tasks
      </h2>
      {tasks.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          No tasks assigned yet.
        </p>
      ) : (
        <div className="mt-4 space-y-6">
          {openTasks.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Open
              </h3>
              <ul className="mt-2 space-y-3">
                {openTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </ul>
            </section>
          )}
          {closedTasks.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Closed
              </h3>
              <ul className="mt-2 space-y-3">
                {closedTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

type TaskWithRelations = {
  id: string;
  title: string;
  priority: string;
  status: string;
  deadline: Date | null;
  project: { id: string; name: string } | null;
  _count: { subtasks: number; proofs: number };
  subtasks: { isCompleted: boolean }[];
};

function TaskCard({ task }: { task: TaskWithRelations }) {
  const overdue = isOverdue(task.deadline, task.status);
  const completedSubtasks = task.subtasks.filter((s) => s.isCompleted).length;
  const totalSubtasks = task._count.subtasks;

  return (
    <li className="rounded-md border border-zinc-200 p-4 dark:border-zinc-700">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/tasks/${task.id}`}
          className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
        >
          {task.title}
        </Link>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}
        >
          {task.priority}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}
        >
          {STATUS_LABELS[task.status]}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        {task.deadline && (
          <span
            className={
              overdue ? "font-medium text-red-600 dark:text-red-400" : ""
            }
          >
            Due{" "}
            {task.deadline.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            {overdue && " (overdue)"}
          </span>
        )}
        {totalSubtasks > 0 && (
          <span>
            {completedSubtasks}/{totalSubtasks} subtasks
          </span>
        )}
        {task._count.proofs > 0 && (
          <span>
            {task._count.proofs} proof{task._count.proofs !== 1 ? "s" : ""}
          </span>
        )}
        {task.project && <span>&middot; {task.project.name}</span>}
      </div>
    </li>
  );
}
