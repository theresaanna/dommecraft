import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

    // Verify task ownership
    const task = await prisma.task.findUnique({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    if (!body.dependsOnTaskId) {
      return NextResponse.json(
        { error: "dependsOnTaskId is required" },
        { status: 400 }
      );
    }

    // Prevent self-dependency
    if (id === body.dependsOnTaskId) {
      return NextResponse.json(
        { error: "A task cannot depend on itself" },
        { status: 400 }
      );
    }

    // Verify dependsOnTaskId belongs to user
    const dependsOnTask = await prisma.task.findUnique({
      where: { id: body.dependsOnTaskId, userId: session.user.id },
      select: { id: true },
    });

    if (!dependsOnTask) {
      return NextResponse.json(
        { error: "Dependency task not found" },
        { status: 404 }
      );
    }

    const dependency = await prisma.taskDependency.create({
      data: {
        taskId: id,
        dependsOnTaskId: body.dependsOnTaskId,
      },
    });

    return NextResponse.json(dependency, { status: 201 });
  } catch (error) {
    console.error("Error creating dependency:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
