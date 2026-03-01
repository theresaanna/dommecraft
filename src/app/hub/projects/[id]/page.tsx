import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProjectDetailClient from "./ProjectDetailClient";

export default async function ProjectDetailPage({
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

  const project = await prisma.project.findUnique({
    where: { id, userId: session.user.id },
    include: {
      category: {
        select: { id: true, name: true },
      },
      notes: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!project) {
    redirect("/hub");
  }

  const serializedNotes = project.notes.map((note: (typeof project.notes)[number]) => ({
    id: note.id,
    title: note.title,
    content: note.content,
    sortOrder: note.sortOrder,
    reminderAt: note.reminderAt?.toISOString() || null,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <ProjectDetailClient
        project={{
          id: project.id,
          name: project.name,
          description: project.description,
          categoryId: project.categoryId,
          category: project.category,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
        }}
        initialNotes={serializedNotes}
      />
    </div>
  );
}
