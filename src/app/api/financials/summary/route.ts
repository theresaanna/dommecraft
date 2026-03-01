import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function buildWhereClause(
  userId: string,
  searchParams: URLSearchParams
): Prisma.FinancialEntryWhereInput {
  const where: Prisma.FinancialEntryWhereInput = { userId };

  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const timeRange = searchParams.get("time_range");
  const subId = searchParams.get("sub_id");
  const categories = searchParams.getAll("category");
  const paymentMethods = searchParams.getAll("payment_method");
  const isInApp = searchParams.get("is_in_app");

  if (dateFrom || dateTo) {
    where.date = {
      ...(dateFrom && { gte: new Date(dateFrom) }),
      ...(dateTo && { lte: new Date(dateTo) }),
    };
  } else if (timeRange) {
    const now = new Date();
    let start: Date | undefined;
    if (timeRange === "day") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeRange === "week") {
      start = new Date(now);
      start.setDate(start.getDate() - 7);
    } else if (timeRange === "month") {
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
    } else if (timeRange === "year") {
      start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
    }
    if (start) {
      where.date = { gte: start };
    }
  }

  if (subId === "unlinked") {
    where.subId = null;
  } else if (subId) {
    where.subId = subId;
  }

  if (categories.length > 0) {
    where.category = { in: categories };
  }

  if (paymentMethods.length > 0) {
    where.paymentMethod = { in: paymentMethods };
  }

  if (isInApp === "true") {
    where.isInApp = true;
  } else if (isInApp === "false") {
    where.isInApp = false;
  }

  return where;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DOMME") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const where = buildWhereClause(session.user.id, searchParams);
    const groupBy = searchParams.get("group_by") || "month";

    // Totals
    const totals = await prisma.financialEntry.aggregate({
      where,
      _sum: { amount: true },
      _avg: { amount: true },
      _count: true,
    });

    // Per-sub breakdown
    const perSubRaw = await prisma.financialEntry.groupBy({
      by: ["subId"],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
    });

    // Enrich per-sub with names
    const subIds = perSubRaw
      .map((row: (typeof perSubRaw)[number]) => row.subId)
      .filter((id: string | null): id is string => id !== null);

    const subs =
      subIds.length > 0
        ? await prisma.subProfile.findMany({
            where: { id: { in: subIds }, userId: session.user.id },
            select: { id: true, fullName: true },
          })
        : [];

    const subMap = new Map(subs.map((s: (typeof subs)[number]) => [s.id, s.fullName]));

    const perSub = perSubRaw.map((row: (typeof perSubRaw)[number]) => ({
      subId: row.subId,
      subName: row.subId ? subMap.get(row.subId) || "Unknown" : "Unlinked",
      total: row._sum.amount,
      count: row._count,
    }));

    // By category
    const byCategory = await prisma.financialEntry.groupBy({
      by: ["category"],
      where,
      _sum: { amount: true },
      _count: true,
    });

    // Trend over time using raw SQL
    const validGroupings = ["day", "week", "month"];
    const grouping = validGroupings.includes(groupBy) ? groupBy : "month";

    // Build date conditions for raw query
    const conditions: string[] = [`user_id = '${session.user.id}'`];
    if (where.date && typeof where.date === "object") {
      const dateFilter = where.date as { gte?: Date; lte?: Date };
      if (dateFilter.gte) {
        conditions.push(`date >= '${dateFilter.gte.toISOString()}'`);
      }
      if (dateFilter.lte) {
        conditions.push(`date <= '${dateFilter.lte.toISOString()}'`);
      }
    }

    const trend = await prisma.$queryRawUnsafe<
      { period: Date; total: number; count: number }[]
    >(
      `SELECT date_trunc('${grouping}', date) as period,
              SUM(amount)::numeric as total,
              COUNT(*)::int as count
       FROM financial_entries
       WHERE ${conditions.join(" AND ")}
       GROUP BY period
       ORDER BY period ASC`
    );

    return NextResponse.json({
      total: totals._sum.amount || 0,
      average: totals._avg.amount || 0,
      count: totals._count,
      perSub,
      byCategory: byCategory.map((row: (typeof byCategory)[number]) => ({
        category: row.category,
        total: row._sum.amount,
        count: row._count,
      })),
      trend: trend.map((row: (typeof trend)[number]) => ({
        period: row.period,
        total: row.total,
        count: row.count,
      })),
    });
  } catch (error) {
    console.error("Error getting financial summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
