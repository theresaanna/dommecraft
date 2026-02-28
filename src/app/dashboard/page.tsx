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
