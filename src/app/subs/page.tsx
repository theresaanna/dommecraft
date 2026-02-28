import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

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

      {subs.length === 0 ? (
        <p className="mt-8 text-center text-zinc-500 dark:text-zinc-400">
          {q ? "No subs match your search." : "No subs yet. Add your first sub to get started."}
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-200 dark:divide-zinc-800">
          {subs.map((sub) => (
            <li key={sub.id}>
              <Link
                href={`/subs/${sub.id}`}
                className="block py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                    {sub.fullName}
                  </h2>
                  {sub.contactInfo && (
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {sub.contactInfo}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {sub.subType.map((type) => (
                    <span
                      key={type}
                      className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      {type}
                    </span>
                  ))}
                  {sub.arrangementType.map((type) => (
                    <span
                      key={type}
                      className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                    >
                      {type}
                    </span>
                  ))}
                </div>
                {sub.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {sub.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs text-zinc-400 dark:text-zinc-500"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
