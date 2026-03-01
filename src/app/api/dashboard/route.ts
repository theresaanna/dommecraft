import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const isDomme = session.user.role === "DOMME";

  if (!isDomme) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(now.getDate() + 7);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const [
    subCount,
    recentSubs,
    financialAllTime,
    financialRecent,
    topEarners,
    overdueCount,
    inProgressCount,
    completedThisWeekCount,
    upcomingEvents,
    recentFinancialEntries,
    recentCompletedTasks,
    recentNotes,
    unreadNotifications,
  ] = await Promise.all([
    // Sub overview
    prisma.subProfile.count({
      where: { userId, isArchived: false },
    }),
    prisma.subProfile.findMany({
      where: { userId, isArchived: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        fullName: true,
        subType: true,
        arrangementType: true,
        createdAt: true,
      },
    }),

    // Financial summary
    prisma.financialEntry.aggregate({
      where: { userId },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.financialEntry.aggregate({
      where: { userId, date: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.financialEntry.groupBy({
      by: ["subId"],
      where: { userId, subId: { not: null } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 3,
    }),

    // Task summary
    prisma.task.count({
      where: {
        userId,
        status: { in: ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED"] },
        deadline: { lt: now },
      },
    }),
    prisma.task.count({
      where: { userId, status: "IN_PROGRESS" },
    }),
    prisma.task.count({
      where: {
        userId,
        status: "COMPLETED",
        completedAt: { gte: startOfWeek },
      },
    }),

    // Upcoming events
    prisma.calendarEvent.findMany({
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
      },
    }),

    // Recent activity
    prisma.financialEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        amount: true,
        currency: true,
        category: true,
        date: true,
        createdAt: true,
        sub: { select: { fullName: true } },
      },
    }),
    prisma.task.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 5,
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
      take: 5,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        project: { select: { id: true, name: true } },
      },
    }),

    // Notifications
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  // Resolve top earner sub names
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

  return NextResponse.json({
    subOverview: {
      totalCount: subCount,
      recentSubs,
    },
    financialSummary: {
      allTimeTotal: financialAllTime._sum.amount?.toString() || "0",
      allTimeCount: financialAllTime._count,
      recentTotal: financialRecent._sum.amount?.toString() || "0",
      recentCount: financialRecent._count,
      topEarners: topEarners.map((e: (typeof topEarners)[number]) => ({
        subId: e.subId,
        subName: subNameMap.get(e.subId!) || "Unknown",
        total: e._sum.amount?.toString() || "0",
      })),
    },
    taskSummary: {
      overdueCount,
      inProgressCount,
      completedThisWeekCount,
    },
    upcomingEvents,
    recentActivity: {
      financialEntries: recentFinancialEntries.map((e: (typeof recentFinancialEntries)[number]) => ({
        id: e.id,
        amount: e.amount.toString(),
        currency: e.currency,
        category: e.category,
        date: e.date,
        createdAt: e.createdAt,
        subName: e.sub?.fullName || null,
      })),
      completedTasks: recentCompletedTasks.map((t: (typeof recentCompletedTasks)[number]) => ({
        id: t.id,
        title: t.title,
        completedAt: t.completedAt,
        subName: t.sub.fullName,
      })),
      recentNotes: recentNotes.map((n: (typeof recentNotes)[number]) => ({
        id: n.id,
        title: n.title,
        updatedAt: n.updatedAt,
        projectId: n.project.id,
        projectName: n.project.name,
      })),
    },
    unreadNotifications,
  });
}
