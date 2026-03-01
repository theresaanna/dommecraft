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

    if (!body.title || typeof body.title !== "string" || body.title.trim() === "") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Auto-compute sortOrder
    const maxSortOrder = await prisma.subtask.aggregate({
      where: { taskId: id },
      _max: { sortOrder: true },
    });

    const sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    const subtask = await prisma.subtask.create({
      data: {
        userId: session.user.id,
        taskId: id,
        title: body.title.trim(),
        sortOrder,
      },
    });

    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    console.error("Error creating subtask:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
