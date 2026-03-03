import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DOMME") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const tasks = await prisma.projectTask.findMany({
      where: { projectId: id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching project tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DOMME") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    if (
      !body.title ||
      typeof body.title !== "string" ||
      body.title.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const maxOrder = await prisma.projectTask.findFirst({
      where: { projectId: id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const sortOrder = (maxOrder?.sortOrder ?? -1) + 1;
    const title = body.title.trim();
    const deadline = body.deadline ? new Date(body.deadline) : null;

    if (deadline) {
      const task = await prisma.$transaction(async (tx) => {
        const event = await tx.calendarEvent.create({
          data: {
            userId: session.user.id,
            title: `TASK: ${title}`,
            startAt: deadline,
            isAllDay: true,
            sourceType: "PROJECT_TASK",
          },
        });

        return tx.projectTask.create({
          data: {
            userId: session.user.id,
            projectId: id,
            title,
            deadline,
            sortOrder,
            calendarEventId: event.id,
          },
        });
      });

      return NextResponse.json(task, { status: 201 });
    }

    const task = await prisma.projectTask.create({
      data: {
        userId: session.user.id,
        projectId: id,
        title,
        deadline: null,
        sortOrder,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating project task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
