import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NewTaskPageClient from "./NewTaskPageClient";

export default async function NewTaskPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "DOMME") {
    redirect("/dashboard");
  }

  const availableSubs = await prisma.subProfile.findMany({
    where: { userId: session.user.id, isArchived: false },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  const availableProjects = await prisma.project.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <NewTaskPageClient
        availableSubs={availableSubs}
        availableProjects={availableProjects}
      />
    </div>
  );
}
