import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DOMME") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { taskId } = await params;

    const existing = await prisma.projectTask.findUnique({
      where: { id: taskId, userId: session.user.id },
      select: {
        id: true,
        title: true,
        deadline: true,
        calendarEventId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();

    const newTitle =
      body.title !== undefined ? String(body.title).trim() : existing.title;
    const deadlineChanged = body.deadline !== undefined;
    const newDeadline = deadlineChanged
      ? body.deadline
        ? new Date(body.deadline)
        : null
      : existing.deadline;

    // Build update data for the task
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = newTitle;
    if (body.completed !== undefined) updateData.completed = body.completed;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
    if (deadlineChanged) updateData.deadline = newDeadline;

    // Calendar sync logic
    const titleChanged =
      body.title !== undefined && newTitle !== existing.title;
    const needsEventCreate =
      deadlineChanged && newDeadline && !existing.calendarEventId;
    const needsEventUpdate =
      (deadlineChanged && newDeadline && existing.calendarEventId) ||
      (titleChanged && existing.calendarEventId && !deadlineChanged);
    const needsEventDelete =
      deadlineChanged && !newDeadline && existing.calendarEventId;

    if (needsEventCreate) {
      const task = await prisma.$transaction(async (tx) => {
        const event = await tx.calendarEvent.create({
          data: {
            userId: session.user.id,
            title: `TASK: ${newTitle}`,
            startAt: newDeadline!,
            isAllDay: true,
            sourceType: "PROJECT_TASK",
          },
        });

        return tx.projectTask.update({
          where: { id: taskId },
          data: { ...updateData, calendarEventId: event.id },
        });
      });

      return NextResponse.json(task);
    }

    if (needsEventUpdate) {
      const eventUpdate: Record<string, unknown> = {};
      if (titleChanged || deadlineChanged)
        eventUpdate.title = `TASK: ${newTitle}`;
      if (deadlineChanged && newDeadline) eventUpdate.startAt = newDeadline;

      const task = await prisma.$transaction(async (tx) => {
        await tx.calendarEvent.update({
          where: { id: existing.calendarEventId! },
          data: eventUpdate,
        });

        return tx.projectTask.update({
          where: { id: taskId },
          data: updateData,
        });
      });

      return NextResponse.json(task);
    }

    if (needsEventDelete) {
      const task = await prisma.$transaction(async (tx) => {
        await tx.calendarEvent.delete({
          where: { id: existing.calendarEventId! },
        });

        return tx.projectTask.update({
          where: { id: taskId },
          data: { ...updateData, calendarEventId: null },
        });
      });

      return NextResponse.json(task);
    }

    // No calendar changes needed
    const task = await prisma.projectTask.update({
      where: { id: taskId },
      data: updateData,
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error updating project task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DOMME") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { taskId } = await params;

    const existing = await prisma.projectTask.findUnique({
      where: { id: taskId, userId: session.user.id },
      select: { id: true, calendarEventId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (existing.calendarEventId) {
      await prisma.$transaction([
        prisma.projectTask.delete({ where: { id: taskId } }),
        prisma.calendarEvent.delete({
          where: { id: existing.calendarEventId },
        }),
      ]);
    } else {
      await prisma.projectTask.delete({ where: { id: taskId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
