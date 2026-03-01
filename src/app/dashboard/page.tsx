import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const isDomme = session.user.role === "DOMME";
  const userId = session.user.id;

  const subs = isDomme
    ? await prisma.subProfile.findMany({
        where: { userId, isArchived: false },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          fullName: true,
          subType: true,
          arrangementType: true,
        },
      })
    : [];

  const financialTotals = isDomme
    ? await prisma.financialEntry.aggregate({
        where: { userId },
        _sum: { amount: true },
        _count: true,
      })
    : null;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const financialRecent = isDomme
    ? await prisma.financialEntry.aggregate({
        where: { userId, date: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
        _count: true,
      })
    : null;

  const topEarners = isDomme
    ? await prisma.financialEntry.groupBy({
        by: ["subId"],
        where: { userId, subId: { not: null } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 3,
      })
    : [];

  const topEarnerSubIds = topEarners
    .map((e: (typeof topEarners)[number]) => e.subId)
    .filter((id: string | null): id is string => id !== null);

  const topEarnerSubs =
    topEarnerSubIds.length > 0
      ? await prisma.subProfile.findMany({
          where: { id: { in: topEarnerSubIds } },
          select: { id: true, fullName: true },
        })
      : [];

  const subNameMap = new Map(topEarnerSubs.map((s: (typeof topEarnerSubs)[number]) => [s.id, s.fullName]));

  // Recent hub projects (DOMME only)
  const recentProjects = isDomme
    ? await prisma.project.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          category: { select: { name: true } },
          _count: { select: { notes: true } },
        },
      })
    : [];

  // Tasks (DOMME: assigned tasks, SUB: received tasks)
  const dommeTasks = isDomme
    ? await prisma.task.findMany({
        where: {
          userId,
          status: { in: ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED"] },
        },
        orderBy: [
          { deadline: { sort: "asc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        take: 5,
        select: {
          id: true,
          title: true,
          priority: true,
          status: true,
          deadline: true,
          sub: { select: { fullName: true } },
        },
      })
    : [];

  const submittedCount = isDomme
    ? await prisma.task.count({
        where: { userId, status: "SUBMITTED" },
      })
    : 0;

  // Task summary counts (DOMME only)
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const overdueCount = isDomme
    ? await prisma.task.count({
        where: {
          userId,
          status: { in: ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED"] },
          deadline: { lt: now },
        },
      })
    : 0;

  const inProgressCount = isDomme
    ? await prisma.task.count({
        where: { userId, status: "IN_PROGRESS" },
      })
    : 0;

  const completedThisWeekCount = isDomme
    ? await prisma.task.count({
        where: {
          userId,
          status: "COMPLETED",
          completedAt: { gte: startOfWeek },
        },
      })
    : 0;

  // SUB tasks
  const linkedProfiles = !isDomme
    ? await prisma.subProfile.findMany({
        where: { linkedUserId: userId },
        select: { id: true },
      })
    : [];
  const subProfileIds = linkedProfiles.map((p: (typeof linkedProfiles)[number]) => p.id);

  const subTasks =
    !isDomme && subProfileIds.length > 0
      ? await prisma.task.findMany({
          where: {
            subId: { in: subProfileIds },
            status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
          },
          orderBy: [
            { deadline: { sort: "asc", nulls: "last" } },
            { createdAt: "desc" },
          ],
          take: 5,
          select: {
            id: true,
            title: true,
            priority: true,
            status: true,
            deadline: true,
          },
        })
      : [];

  // Upcoming calendar events (DOMME only)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const upcomingEvents = isDomme
    ? await prisma.calendarEvent.findMany({
        where: {
          userId,
          startAt: { gte: now, lte: sevenDaysFromNow },
          recurrenceRule: null,
        },
        orderBy: { startAt: "asc" },
        take: 5,
        select: {
          id: true,
          title: true,
          startAt: true,
          isAllDay: true,
          sourceType: true,
          color: true,
        },
      })
    : [];

  // Recent activity (DOMME only)
  const recentFinancialEntries = isDomme
    ? await prisma.financialEntry.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          amount: true,
          currency: true,
          category: true,
          date: true,
          sub: { select: { fullName: true } },
        },
      })
    : [];

  const recentCompletedTasks = isDomme
    ? await prisma.task.findMany({
        where: { userId, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          completedAt: true,
          sub: { select: { fullName: true } },
        },
      })
    : [];

  const recentNotes = isDomme
    ? await prisma.note.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          project: { select: { id: true, name: true } },
        },
      })
    : [];

  // Notifications
  const unreadNotifications = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  const EVENT_SOURCE_COLORS: Record<string, string> = {
    STANDALONE: "#3b82f6",
    TASK: "#f59e0b",
    REMINDER: "#8b5cf6",
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-16 pb-40">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Dashboard
      </h1>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-zinc-600 dark:text-zinc-400">
          Welcome, {session.user.name || session.user.email || "User"}
        </p>
        <Link
          href="/notifications"
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            unreadNotifications > 0
              ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          }`}
        >
          {unreadNotifications > 0
            ? `${unreadNotifications} new ${unreadNotifications === 1 ? "notification" : "notifications"}`
            : "Notifications"}
        </Link>
      </div>

      {isDomme && (
        <div className="mt-6 flex gap-3">
          <Link
            href="/subs/new"
            className="flex-1 rounded-lg border border-zinc-200 px-4 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900/50"
          >
            Add Sub
          </Link>
          <Link
            href="/financials/new"
            className="flex-1 rounded-lg border border-zinc-200 px-4 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900/50"
          >
            New Entry
          </Link>
          <Link
            href="/tasks/new"
            className="flex-1 rounded-lg border border-zinc-200 px-4 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900/50"
          >
            Create Task
          </Link>
          <Link
            href="/calendar/new"
            className="flex-1 rounded-lg border border-zinc-200 px-4 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900/50"
          >
            New Event
          </Link>
        </div>
      )}

      {isDomme && (recentFinancialEntries.length > 0 || recentCompletedTasks.length > 0 || recentNotes.length > 0) && (
        <div className="mt-8 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Recent Activity
            </h2>
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {recentFinancialEntries.slice(0, 3).map((entry: (typeof recentFinancialEntries)[number]) => (
              <li key={`fin-${entry.id}`}>
                <Link
                  href="/financials"
                  className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      Financial
                    </span>
                    <span className="text-sm text-zinc-900 dark:text-zinc-50">
                      {entry.category}
                      {entry.sub ? ` - ${entry.sub.fullName}` : ""}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    ${parseFloat(entry.amount.toString()).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </Link>
              </li>
            ))}
            {recentCompletedTasks.slice(0, 3).map((task: (typeof recentCompletedTasks)[number]) => (
              <li key={`task-${task.id}`}>
                <Link
                  href={`/tasks/${task.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      Task Done
                    </span>
                    <span className="text-sm text-zinc-900 dark:text-zinc-50">
                      {task.title}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {task.sub.fullName}
                  </span>
                </Link>
              </li>
            ))}
            {recentNotes.slice(0, 3).map((note: (typeof recentNotes)[number]) => (
              <li key={`note-${note.id}`}>
                <Link
                  href={`/hub/projects/${note.project.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      Note
                    </span>
                    <span className="text-sm text-zinc-900 dark:text-zinc-50">
                      {note.title || "Untitled"}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {note.project.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
            <Link
              href="/activity"
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            >
              View all activity &rarr;
            </Link>
          </div>
        </div>
      )}

      {isDomme && (
        <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              My Subs
            </h2>
            <Link
              href="/subs/new"
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Add Sub
            </Link>
          </div>
          {subs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              <p>No subs yet.</p>
              <Link
                href="/subs/new"
                className="mt-2 inline-block text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              >
                Add your first sub to get started
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {subs.map((sub: (typeof subs)[number]) => (
                <li key={sub.id}>
                  <Link
                    href={`/subs/${sub.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {sub.fullName}
                    </span>
                    <div className="flex gap-1">
                      {sub.subType.slice(0, 2).map((type: string) => (
                        <span
                          key={type}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {subs.length > 0 && (
            <div className="border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
              <Link
                href="/subs"
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              >
                View all subs &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      {isDomme && financialTotals && (
        <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Financials
            </h2>
            <Link
              href="/financials/new"
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Add Entry
            </Link>
          </div>

          {financialTotals._count === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              <p>No financial entries yet.</p>
              <Link
                href="/financials"
                className="mt-2 inline-block text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              >
                Start tracking your earnings
              </Link>
            </div>
          ) : (
            <div className="px-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    All Time
                  </p>
                  <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    ${parseFloat(financialTotals._sum.amount?.toString() || "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {financialTotals._count} entries
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Last 30 Days
                  </p>
                  <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    ${parseFloat(financialRecent?._sum.amount?.toString() || "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {financialRecent?._count || 0} entries
                  </p>
                </div>
              </div>

              {topEarners.length > 0 && (
                <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Top Earners
                  </p>
                  <ul className="mt-2 space-y-1">
                    {topEarners.map((entry: (typeof topEarners)[number]) => (
                      <li
                        key={entry.subId}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {String(subNameMap.get(entry.subId!) || "Unknown")}
                        </span>
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">
                          ${parseFloat(entry._sum.amount?.toString() || "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
            <Link
              href="/financials"
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            >
              View all financials &rarr;
            </Link>
          </div>
        </div>
      )}

      {isDomme && (
        <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Creation Hub
            </h2>
            <Link
              href="/hub"
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Open Hub
            </Link>
          </div>
          {recentProjects.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              <p>No projects yet.</p>
              <Link
                href="/hub"
                className="mt-2 inline-block text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              >
                Create your first project
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recentProjects.map((project: (typeof recentProjects)[number]) => (
                <li key={project.id}>
                  <Link
                    href={`/hub/projects/${project.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {project.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {project.category.name}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {project._count.notes}{" "}
                        {project._count.notes === 1 ? "note" : "notes"}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {recentProjects.length > 0 && (
            <div className="border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
              <Link
                href="/hub"
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              >
                View all projects &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      {isDomme && (
        <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Task Summary
            </h2>
            <Link
              href="/tasks"
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              View Tasks
            </Link>
          </div>
          <div className="grid grid-cols-3 divide-x divide-zinc-100 dark:divide-zinc-800">
            <div className="px-4 py-4 text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {overdueCount}
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Overdue
              </p>
            </div>
            <div className="px-4 py-4 text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {inProgressCount}
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                In Progress
              </p>
            </div>
            <div className="px-4 py-4 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {completedThisWeekCount}
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Done This Week
              </p>
            </div>
          </div>
          {submittedCount > 0 && (
            <div className="border-t border-zinc-100 px-4 py-2 dark:border-zinc-800">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                {submittedCount} task{submittedCount === 1 ? "" : "s"} awaiting
                review
              </span>
            </div>
          )}
          {dommeTasks.length > 0 && (
            <>
              <ul className="divide-y divide-zinc-100 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {dommeTasks.map((task: (typeof dommeTasks)[number]) => (
                  <li key={task.id}>
                    <Link
                      href={`/tasks/${task.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {task.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {task.sub.fullName}
                        </span>
                        {task.status === "SUBMITTED" && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            Submitted
                          </span>
                        )}
                        {task.deadline && (
                          <span
                            className={`text-xs ${
                              new Date(task.deadline) < new Date() &&
                              task.status !== "COMPLETED"
                                ? "text-red-600 dark:text-red-400"
                                : "text-zinc-500 dark:text-zinc-400"
                            }`}
                          >
                            {new Date(task.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
                <Link
                  href="/tasks"
                  className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                >
                  View all tasks &rarr;
                </Link>
              </div>
            </>
          )}
          {dommeTasks.length === 0 && (
            <div className="border-t border-zinc-200 px-4 py-4 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <p>No active tasks.</p>
            </div>
          )}
        </div>
      )}

      {isDomme && (
        <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Calendar
            </h2>
            <Link
              href="/calendar"
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              View Calendar
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              <p>No upcoming events this week.</p>
              <Link
                href="/calendar"
                className="mt-2 inline-block text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              >
                Add an event to your calendar
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {upcomingEvents.map((event: (typeof upcomingEvents)[number]) => {
                const eventColor =
                  event.color || EVENT_SOURCE_COLORS[event.sourceType] || "#3b82f6";
                return (
                  <li key={event.id}>
                    <Link
                      href="/calendar"
                      className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: eventColor }}
                        />
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {event.title}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {event.isAllDay
                          ? new Date(event.startAt).toLocaleDateString()
                          : new Date(event.startAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {upcomingEvents.length > 0 && (
            <div className="border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
              <Link
                href="/calendar"
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              >
                View full calendar &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      {!isDomme && (
        <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              My Tasks
            </h2>
            <Link
              href="/my-tasks"
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              View All
            </Link>
          </div>
          {subProfileIds.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              <p>Your account is not linked yet.</p>
              <Link
                href="/link"
                className="mt-2 inline-block text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              >
                Link your account with an invite code
              </Link>
            </div>
          ) : subTasks.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              <p>No active tasks assigned.</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {subTasks.map((task: (typeof subTasks)[number]) => (
                <li key={task.id}>
                  <Link
                    href={`/my-tasks/${task.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {task.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          task.priority === "HIGH"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            : task.priority === "MEDIUM"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {task.priority}
                      </span>
                      {task.deadline && (
                        <span
                          className={`text-xs ${
                            new Date(task.deadline) < new Date()
                              ? "text-red-600 dark:text-red-400"
                              : "text-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          {new Date(task.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {subTasks.length > 0 && (
            <div className="border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
              <Link
                href="/my-tasks"
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              >
                View all tasks &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="mt-6 rounded-md bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Sign out
        </button>
      </form>

      <footer className="sticky bottom-0 mt-12 border-t border-zinc-200 bg-background pb-8 pt-6 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          {isDomme ? (
            <>
              <Link
                href="/subs/new"
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900/50"
              >
                Add Sub
              </Link>
              <Link
                href="/financials/new"
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900/50"
              >
                New Entry
              </Link>
              <Link
                href="/tasks/new"
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900/50"
              >
                Create Task
              </Link>
              <Link
                href="/calendar/new"
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900/50"
              >
                New Event
              </Link>
            </>
          ) : (
            <Link
              href="/my-tasks"
              className="flex-1 rounded-lg border border-zinc-200 px-4 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900/50"
            >
              My Tasks
            </Link>
          )}
        </div>
        <div className="mt-4 text-center">
          <Link
            href="/notifications"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              unreadNotifications > 0
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            {unreadNotifications > 0 && (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
            )}
            {unreadNotifications > 0
              ? `${unreadNotifications} new ${unreadNotifications === 1 ? "notification" : "notifications"}`
              : "Notifications"}
          </Link>
        </div>
      </footer>
    </div>
  );
}
