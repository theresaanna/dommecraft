import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const subs = await prisma.subProfile.findMany({
    where: { userId: session.user.id, isArchived: false },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      fullName: true,
      subType: true,
      arrangementType: true,
    },
  });

  // Financial summary (DOMME only)
  const isDomme = session.user.role === "DOMME";

  const financialTotals = isDomme
    ? await prisma.financialEntry.aggregate({
        where: { userId: session.user.id },
        _sum: { amount: true },
        _count: true,
      })
    : null;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const financialRecent = isDomme
    ? await prisma.financialEntry.aggregate({
        where: { userId: session.user.id, date: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
        _count: true,
      })
    : null;

  const topEarners = isDomme
    ? await prisma.financialEntry.groupBy({
        by: ["subId"],
        where: { userId: session.user.id, subId: { not: null } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 3,
      })
    : [];

  const topEarnerSubIds = topEarners
    .map((e) => e.subId)
    .filter((id): id is string => id !== null);

  const topEarnerSubs =
    topEarnerSubIds.length > 0
      ? await prisma.subProfile.findMany({
          where: { id: { in: topEarnerSubIds } },
          select: { id: true, fullName: true },
        })
      : [];

  const subNameMap = new Map(topEarnerSubs.map((s) => [s.id, s.fullName]));

  // Recent hub projects (DOMME only)
  const recentProjects = isDomme
    ? await prisma.project.findMany({
        where: { userId: session.user.id },
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
          userId: session.user.id,
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
        where: { userId: session.user.id, status: "SUBMITTED" },
      })
    : 0;

  // SUB tasks
  const linkedProfiles = !isDomme
    ? await prisma.subProfile.findMany({
        where: { linkedUserId: session.user.id },
        select: { id: true },
      })
    : [];
  const subProfileIds = linkedProfiles.map((p) => p.id);

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
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const upcomingEvents = isDomme
    ? await prisma.calendarEvent.findMany({
        where: {
          userId: session.user.id,
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
        },
      })
    : [];

  // Notifications
  const unreadNotifications = await prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Dashboard
      </h1>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-zinc-600 dark:text-zinc-400">
          Welcome, {session.user.name || session.user.email || "User"}
        </p>
        {unreadNotifications > 0 && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            {unreadNotifications} new{" "}
            {unreadNotifications === 1 ? "notification" : "notifications"}
          </span>
        )}
      </div>

      <div className="mt-8 rounded-lg border border-zinc-200 dark:border-zinc-800">
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
            {subs.map((sub) => (
              <li key={sub.id}>
                <Link
                  href={`/subs/${sub.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {sub.fullName}
                  </span>
                  <div className="flex gap-1">
                    {sub.subType.slice(0, 2).map((type) => (
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

      {isDomme && financialTotals && (
        <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Financials
            </h2>
            <Link
              href="/financials"
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
                    {topEarners.map((entry) => (
                      <li
                        key={entry.subId}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {subNameMap.get(entry.subId!) || "Unknown"}
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
              {recentProjects.map((project) => (
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
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Tasks
              </h2>
              {submittedCount > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  {submittedCount} awaiting review
                </span>
              )}
            </div>
            <Link
              href="/tasks"
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              View Tasks
            </Link>
          </div>
          {dommeTasks.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              <p>No active tasks.</p>
              <Link
                href="/tasks"
                className="mt-2 inline-block text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              >
                Assign a task to a sub
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {dommeTasks.map((task) => (
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
          )}
          {dommeTasks.length > 0 && (
            <div className="border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
              <Link
                href="/tasks"
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              >
                View all tasks &rarr;
              </Link>
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
              {upcomingEvents.map((event) => (
                <li key={event.id}>
                  <Link
                    href="/calendar"
                    className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {event.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {event.sourceType === "TASK"
                          ? "Task"
                          : event.sourceType === "REMINDER"
                            ? "Reminder"
                            : "Event"}
                      </span>
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
                    </div>
                  </Link>
                </li>
              ))}
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
              {subTasks.map((task) => (
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
    </div>
  );
}
