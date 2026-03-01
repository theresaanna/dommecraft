import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function BadgesPage({
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

  const badges = await prisma.badge.findMany({
    where: { subId: id, userId: session.user.id },
    orderBy: { earnedAt: "desc" },
  });

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Badges
      </h2>
      {badges.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          No badges yet.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {badges.map((badge) => (
            <li
              key={badge.id}
              className="rounded-md border border-zinc-200 p-4 dark:border-zinc-700"
            >
              <div className="flex items-center gap-2">
                {badge.icon && <span className="text-xl">{badge.icon}</span>}
                <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                  {badge.name}
                </h3>
              </div>
              {badge.description && (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {badge.description}
                </p>
              )}
              <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                Earned {badge.earnedAt.toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
