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

    const task = await prisma.task.findUnique({
      where: { id, userId: session.user.id },
      include: {
        subtasks: {
          orderBy: { sortOrder: "asc" },
        },
        proofs: true,
        project: {
          select: { id: true, name: true },
        },
        sub: {
          select: { id: true, fullName: true },
        },
        dependsOn: {
          include: {
            dependsOn: {
              select: { id: true, title: true, status: true },
            },
          },
        },
        dependedOnBy: {
          include: {
            task: {
              select: { id: true, title: true, status: true },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const existing = await prisma.task.findUnique({
      where: { id, userId: session.user.id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Verify project ownership if projectId is being changed
    if (body.projectId !== undefined && body.projectId !== null) {
      const project = await prisma.project.findUnique({
        where: { id: body.projectId, userId: session.user.id },
        select: { id: true },
      });
      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }
    }

    // Handle completedAt based on status changes
    let completedAt: Date | null | undefined = undefined;
    if (body.status !== undefined) {
      if (body.status === "COMPLETED" && existing.status !== "COMPLETED") {
        completedAt = new Date();
      } else if (body.status !== "COMPLETED" && existing.status === "COMPLETED") {
        completedAt = null;
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.deadline !== undefined && {
          deadline: body.deadline ? new Date(body.deadline) : null,
        }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.reminderOffset !== undefined && {
          reminderOffset: body.reminderOffset,
        }),
        ...(body.projectId !== undefined && { projectId: body.projectId }),
        ...(completedAt !== undefined && { completedAt }),
      },
    });

    // Send notification on relevant status changes
    if (body.status && body.status !== existing.status) {
      const task = await prisma.task.findUnique({
        where: { id },
        include: { sub: true },
      });

      if (task?.sub.linkedUserId) {
        let message: string | null = null;
        let type: "TASK_COMPLETED" | "TASK_UPDATED" | null = null;

        if (body.status === "COMPLETED") {
          message = `Task approved: ${task.title}`;
          type = "TASK_COMPLETED";
        } else if (
          body.status === "IN_PROGRESS" &&
          existing.status === "SUBMITTED"
        ) {
          message = `Task returned for revision: ${task.title}`;
          type = "TASK_UPDATED";
        }

        if (message && type) {
          await prisma.notification.create({
            data: {
              userId: task.sub.linkedUserId,
              type,
              message,
              linkUrl: `/my-tasks/${id}`,
              taskId: id,
            },
          });
        }
      }
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const existing = await prisma.task.findUnique({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
