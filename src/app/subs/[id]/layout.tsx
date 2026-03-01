import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function SubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const sub = await prisma.subProfile.findUnique({
    where: { id, userId: session.user.id },
    select: { id: true, fullName: true },
  });

  if (!sub) {
    redirect("/subs");
  }

  const tabs = [
    { label: "Profile", href: `/subs/${id}` },
    { label: "Badges", href: `/subs/${id}/badges` },
    { label: "Media", href: `/subs/${id}/media` },
    { label: "Ratings", href: `/subs/${id}/ratings` },
    { label: "Behavior", href: `/subs/${id}/behavior` },
    { label: "Contracts", href: `/subs/${id}/contracts` },
    { label: "Tasks", href: `/subs/${id}/tasks` },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-4">
        <Link
          href="/subs"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          &larr; All Subs
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {sub.fullName}
      </h1>
      <nav className="mt-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
