import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NewProjectPageClient from "./NewProjectPageClient";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "DOMME") {
    redirect("/dashboard");
  }

  const { category } = await searchParams;

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    orderBy: { sortOrder: "asc" },
  });

  const serializedCategories = categories.map(
    (c: (typeof categories)[number]) => ({
      id: c.id,
      name: c.name,
    })
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <NewProjectPageClient
        categories={serializedCategories}
        defaultCategoryId={category || null}
      />
    </div>
  );
}
