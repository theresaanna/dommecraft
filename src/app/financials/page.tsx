import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import FinancialsFilters from "./FinancialsFilters";
import FinancialsSummary from "./FinancialsSummary";
import FinancialsList from "./FinancialsList";
import FinancialsPageClient from "./FinancialsPageClient";

type SearchParams = {
  time_range?: string;
  date_from?: string;
  date_to?: string;
  sub_id?: string;
  category?: string | string[];
  payment_method?: string | string[];
  is_in_app?: string;
  sort?: string;
  order?: string;
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function FinancialsPage({
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
  const timeRange = params.time_range || "";
  const dateFrom = params.date_from || "";
  const dateTo = params.date_to || "";
  const subId = params.sub_id || "";
  const categories = toArray(params.category);
  const paymentMethods = toArray(params.payment_method);
  const isInApp = params.is_in_app || "";
  const sort = params.sort || "date";
  const order = params.order || "desc";

  // Build where clause
  const where: Prisma.FinancialEntryWhereInput = {
    userId: session.user.id,
  };

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

  const validSortFields = ["date", "amount", "createdAt"];
  const sortField = validSortFields.includes(sort) ? sort : "date";
  const sortOrder = order === "asc" ? "asc" : "desc";

  // Fetch entries
  const entries = await prisma.financialEntry.findMany({
    where,
    orderBy: { [sortField]: sortOrder },
    include: {
      sub: {
        select: { id: true, fullName: true },
      },
    },
  });

  // Fetch summary aggregates
  const totals = await prisma.financialEntry.aggregate({
    where,
    _sum: { amount: true },
    _avg: { amount: true },
    _count: true,
  });

  const perSubRaw = await prisma.financialEntry.groupBy({
    by: ["subId"],
    where,
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: "desc" } },
  });

  const subIds = perSubRaw
    .map((row) => row.subId)
    .filter((id): id is string => id !== null);

  const subsForNames =
    subIds.length > 0
      ? await prisma.subProfile.findMany({
          where: { id: { in: subIds }, userId: session.user.id },
          select: { id: true, fullName: true },
        })
      : [];

  const subMap = new Map(subsForNames.map((s) => [s.id, s.fullName]));

  const perSub = perSubRaw.map((row) => ({
    subId: row.subId,
    subName: row.subId ? subMap.get(row.subId) || "Unknown" : "Unlinked",
    total: row._sum.amount?.toString() || "0",
    count: row._count,
  }));

  const byCategoryRaw = await prisma.financialEntry.groupBy({
    by: ["category"],
    where,
    _sum: { amount: true },
    _count: true,
  });

  const byCategory = byCategoryRaw.map((row) => ({
    category: row.category,
    total: row._sum.amount?.toString() || "0",
    count: row._count,
  }));

  // Fetch available subs for filter dropdown
  const availableSubs = await prisma.subProfile.findMany({
    where: { userId: session.user.id, isArchived: false },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  // Serialize for client components
  const serializedEntries = entries.map((entry) => ({
    id: entry.id,
    amount: entry.amount.toString(),
    currency: entry.currency,
    category: entry.category,
    paymentMethod: entry.paymentMethod,
    notes: entry.notes,
    date: entry.date.toISOString(),
    isInApp: entry.isInApp,
    sub: entry.sub,
    subId: entry.subId,
  }));

  const summary = {
    total: totals._sum.amount?.toString() || "0",
    average: totals._avg.amount?.toString() || "0",
    count: totals._count,
    perSub,
    byCategory,
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <FinancialsPageClient
        entries={serializedEntries}
        summary={summary}
        availableSubs={availableSubs}
        currentParams={{
          time_range: timeRange,
          date_from: dateFrom,
          date_to: dateTo,
          sub_id: subId,
          category: categories,
          payment_method: paymentMethods,
          is_in_app: isInApp,
          sort: sortField,
          order: sortOrder,
        }}
      />
    </div>
  );
}
