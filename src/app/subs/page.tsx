import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import SubsList from "./SubsList";
import SubsFilters from "./SubsFilters";
import { Prisma } from "@prisma/client";

type SearchParams = {
  q?: string;
  sub_type?: string | string[];
  arrangement_type?: string | string[];
  tags?: string | string[];
  financial_min?: string;
  financial_max?: string;
  sort?: string;
  order?: string;
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function SubsPage({
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
  const q = params.q;
  const subType = toArray(params.sub_type);
  const arrangementType = toArray(params.arrangement_type);
  const tags = toArray(params.tags);
  const financialMin = params.financial_min;
  const financialMax = params.financial_max;
  const sort = params.sort || "createdAt";
  const order = params.order || "desc";

  const validSortFields = ["createdAt", "updatedAt", "fullName", "expendableIncome"];
  const sortField = validSortFields.includes(sort) ? sort : "createdAt";
  const sortOrder = order === "asc" ? "asc" : "desc";

  const where: Prisma.SubProfileWhereInput = {
    userId: session.user.id,
    isArchived: false,
    ...(q && {
      OR: [
        { fullName: { contains: q, mode: "insensitive" as const } },
        { contactInfo: { contains: q, mode: "insensitive" as const } },
        { privateNotes: { contains: q, mode: "insensitive" as const } },
      ],
    }),
    ...(subType.length > 0 && { subType: { hasSome: subType } }),
    ...(arrangementType.length > 0 && {
      arrangementType: { hasSome: arrangementType },
    }),
    ...(tags.length > 0 && { tags: { hasSome: tags } }),
  };

  if (financialMin || financialMax) {
    where.expendableIncome = { not: null };
  }

  const subs = await prisma.subProfile.findMany({
    where,
    orderBy: { [sortField]: sortOrder },
    select: {
      id: true,
      fullName: true,
      contactInfo: true,
      arrangementType: true,
      subType: true,
      tags: true,
      expendableIncome: true,
      createdAt: true,
    },
  });

  // Client-side financial range filtering (expendableIncome is a free-text string,
  // so we parse it as a number for range comparison)
  const filtered = subs.filter((sub: (typeof subs)[number]) => {
    if (financialMin || financialMax) {
      const income = sub.expendableIncome
        ? parseFloat(sub.expendableIncome.replace(/[^0-9.]/g, ""))
        : null;
      if (income === null || isNaN(income)) return false;
      if (financialMin && income < parseFloat(financialMin)) return false;
      if (financialMax && income > parseFloat(financialMax)) return false;
    }
    return true;
  });

  const serialized = filtered.map((sub: (typeof filtered)[number]) => ({
    ...sub,
    createdAt: sub.createdAt.toISOString(),
  }));

  // Fetch all unique tags for the filter dropdown
  const allSubs = await prisma.subProfile.findMany({
    where: { userId: session.user.id, isArchived: false },
    select: { tags: true },
  });
  const allTags = [...new Set<string>(allSubs.flatMap((s: (typeof allSubs)[number]) => s.tags))].sort();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Subs
        </h1>
        <Link
          href="/subs/new"
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Add Sub
        </Link>
      </div>

      <SubsFilters
        currentParams={{
          q: q || "",
          sub_type: subType,
          arrangement_type: arrangementType,
          tags,
          financial_min: financialMin || "",
          financial_max: financialMax || "",
          sort: sortField,
          order: sortOrder,
        }}
        availableTags={allTags}
      />

      <SubsList subs={serialized} query={q} />
    </div>
  );
}
