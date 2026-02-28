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

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Dashboard
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Welcome, {session.user.name || session.user.email || "User"}
      </p>

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
          <div className="px-4 py-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Organize your content ideas, session plans, contracts, and notes
              in one central place.
            </p>
          </div>
          <div className="border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
            <Link
              href="/hub"
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            >
              View all projects &rarr;
            </Link>
          </div>
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
