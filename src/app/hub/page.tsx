import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import HubPageClient from "./HubPageClient";
import { getLastActivityDate } from "./lastActivity";

const DEFAULT_CATEGORIES = [
  { name: "Content Creation Ideas", sortOrder: 0 },
  { name: "Contract Ideas", sortOrder: 1 },
  { name: "Session Ideas", sortOrder: 2 },
  { name: "General", sortOrder: 3 },
];

export default async function HubPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "DOMME") {
    redirect("/dashboard");
  }

  // Fetch categories, auto-create defaults if none exist
  let categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: { projects: true },
      },
    },
  });

  if (categories.length === 0) {
    await prisma.$transaction(
      DEFAULT_CATEGORIES.map((cat) =>
        prisma.category.create({
          data: {
            userId: session.user.id,
            name: cat.name,
            sortOrder: cat.sortOrder,
          },
        })
      )
    );

    categories = await prisma.category.findMany({
      where: { userId: session.user.id },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });
  }

  // Fetch all projects
  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      category: {
        select: { id: true, name: true },
      },
      projectTasks: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          completed: true,
          deadline: true,
          updatedAt: true,
        },
      },
      notes: {
        select: { updatedAt: true },
      },
      _count: {
        select: { notes: true },
      },
    },
  });

  const serializedCategories = categories.map((c: (typeof categories)[number]) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sortOrder,
    projectCount: c._count.projects,
    createdAt: c.createdAt.toISOString(),
  }));

  const serializedProjects = projects.map((p: (typeof projects)[number]) => {
    const lastActivity = getLastActivityDate(
      p.updatedAt,
      p.notes.map((n: (typeof p.notes)[number]) => n.updatedAt),
      p.projectTasks.map((t: (typeof p.projectTasks)[number]) => t.updatedAt)
    );

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      categoryId: p.categoryId,
      category: p.category,
      notesCount: p._count.notes,
      tasks: p.projectTasks.map((t: (typeof p.projectTasks)[number]) => ({
        id: t.id,
        title: t.title,
        completed: t.completed,
        deadline: t.deadline ? t.deadline.toISOString() : null,
      })),
      createdAt: p.createdAt.toISOString(),
      updatedAt: lastActivity.toISOString(),
    };
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <HubPageClient
        initialCategories={serializedCategories}
        initialProjects={serializedProjects}
      />
    </div>
  );
}
