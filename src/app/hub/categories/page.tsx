import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CategoriesPageClient from "./CategoriesPageClient";

export default async function CategoriesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "DOMME") {
    redirect("/dashboard");
  }

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: { projects: true },
      },
    },
  });

  const serializedCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sortOrder,
    projectCount: c._count.projects,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <CategoriesPageClient initialCategories={serializedCategories} />
    </div>
  );
}
