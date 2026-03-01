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

    // Verify note ownership
    const note = await prisma.note.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!note) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    if (!body.subId) {
      return NextResponse.json(
        { error: "Sub ID is required" },
        { status: 400 }
      );
    }

    // Verify sub ownership
    const sub = await prisma.subProfile.findUnique({
      where: { id: body.subId, userId: session.user.id },
      select: { id: true, linkedUserId: true },
    });

    if (!sub) {
      return NextResponse.json(
        { error: "Sub not found" },
        { status: 404 }
      );
    }

    const task = await prisma.task.create({
      data: {
        userId: session.user.id,
        subId: body.subId,
        title: note.title || "Untitled Task",
        description: note.content,
        projectId: note.projectId,
        sourceNoteId: note.id,
        priority: body.priority || "MEDIUM",
        tags: Array.isArray(body.tags) ? body.tags : [],
        deadline: body.deadline ? new Date(body.deadline) : null,
      },
    });

    // Create notification for linked sub user
    if (sub.linkedUserId) {
      await prisma.notification.create({
        data: {
          userId: sub.linkedUserId,
          type: "TASK_ASSIGNED",
          message: `New task assigned: ${task.title}`,
          linkUrl: `/my-tasks/${task.id}`,
          taskId: task.id,
        },
      });
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error converting note to task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
