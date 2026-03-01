import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function RatingsPage({
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

  const ratings = await prisma.rating.findMany({
    where: { subId: id, userId: session.user.id },
    orderBy: { ratedAt: "desc" },
  });

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Ratings
      </h2>
      {ratings.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          No ratings yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {ratings.map((rating) => (
            <li
              key={rating.id}
              className="rounded-md border border-zinc-200 p-4 dark:border-zinc-700"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {rating.overall}/10
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {rating.ratedAt.toLocaleDateString()}
                </span>
              </div>
              {rating.categories && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(
                    rating.categories as Record<string, number>
                  ).map(([key, value]) => (
                    <span
                      key={key}
                      className="text-xs text-zinc-600 dark:text-zinc-400"
                    >
                      {key}: {value}
                    </span>
                  ))}
                </div>
              )}
              {rating.notes && (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {rating.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
