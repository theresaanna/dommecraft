import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import SubsList from "./SubsList";

export default async function SubsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { q } = await searchParams;

  const where = {
    userId: session.user.id,
    isArchived: false,
    ...(q && {
      OR: [
        { fullName: { contains: q, mode: "insensitive" as const } },
        { contactInfo: { contains: q, mode: "insensitive" as const } },
      ],
    }),
  };

  const subs = await prisma.subProfile.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      contactInfo: true,
      arrangementType: true,
      subType: true,
      tags: true,
      createdAt: true,
    },
  });

  const serialized = subs.map((sub) => ({
    ...sub,
    createdAt: sub.createdAt.toISOString(),
  }));

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

      <form className="mt-6">
        <input
          type="search"
          name="q"
          placeholder="Search subs..."
          defaultValue={q}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-400"
        />
      </form>

      <SubsList subs={serialized} query={q} />
    </div>
  );
}
