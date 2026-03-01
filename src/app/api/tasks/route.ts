import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DOMME") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const subId = searchParams.get("sub_id");
    const projectId = searchParams.get("project_id");
    const deadlineFrom = searchParams.get("deadline_from");
    const deadlineTo = searchParams.get("deadline_to");
    const sort = searchParams.get("sort") || "createdAt";
    const order = searchParams.get("order") || "desc";

    const where: Prisma.TaskWhereInput = {
      userId: session.user.id,
    };

    if (status) {
      where.status = status as Prisma.EnumTaskStatusFilter;
    }

    if (priority) {
      where.priority = priority as Prisma.EnumTaskPriorityFilter;
    }

    if (subId) {
      where.subId = subId;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (deadlineFrom || deadlineTo) {
      where.deadline = {
        ...(deadlineFrom && { gte: new Date(deadlineFrom) }),
        ...(deadlineTo && { lte: new Date(deadlineTo) }),
      };
    }

    const validSortFields = ["deadline", "priority", "createdAt", "title"];
    const sortField = validSortFields.includes(sort) ? sort : "createdAt";
    const sortOrder = order === "asc" ? "asc" : "desc";

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      include: {
        sub: {
          select: { id: true, fullName: true },
        },
        project: {
          select: { id: true, name: true },
        },
        _count: {
          select: { subtasks: true, proofs: true },
        },
        subtasks: {
          select: { isCompleted: true },
        },
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error listing tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DOMME") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    if (!body.title || typeof body.title !== "string" || body.title.trim() === "") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

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

    // Verify project ownership if provided
    if (body.projectId) {
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

    // Verify note ownership if provided
    if (body.sourceNoteId) {
      const note = await prisma.note.findUnique({
        where: { id: body.sourceNoteId, userId: session.user.id },
        select: { id: true },
      });
      if (!note) {
        return NextResponse.json(
          { error: "Note not found" },
          { status: 404 }
        );
      }
    }

    const task = await prisma.task.create({
      data: {
        userId: session.user.id,
        subId: body.subId,
        title: body.title.trim(),
        description: body.description || null,
        priority: body.priority || "MEDIUM",
        projectId: body.projectId || null,
        deadline: body.deadline ? new Date(body.deadline) : null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        reminderOffset: body.reminderOffset ?? null,
        sourceNoteId: body.sourceNoteId || null,
      },
    });

    // Create notification for linked sub user
    if (sub.linkedUserId) {
      await prisma.notification.create({
        data: {
          userId: sub.linkedUserId,
          type: "TASK_ASSIGNED",
          message: `New task assigned: ${body.title.trim()}`,
          linkUrl: `/my-tasks/${task.id}`,
          taskId: task.id,
        },
      });
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
