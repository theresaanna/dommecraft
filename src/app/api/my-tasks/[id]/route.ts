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

    const { id } = await params;

    // Find SubProfiles linked to this user
    const linkedProfiles = await prisma.subProfile.findMany({
      where: { linkedUserId: session.user.id },
      select: { id: true },
    });
    const profileIds = linkedProfiles.map((p: (typeof linkedProfiles)[number]) => p.id);

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        subtasks: {
          orderBy: { sortOrder: "asc" },
        },
        proofs: true,
        sub: {
          select: { id: true, fullName: true },
        },
      },
    });

    if (!task || !profileIds.includes(task.subId)) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error fetching my task:", error);
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

    const { id } = await params;

    // Find SubProfiles linked to this user
    const linkedProfiles = await prisma.subProfile.findMany({
      where: { linkedUserId: session.user.id },
      select: { id: true },
    });
    const profileIds = linkedProfiles.map((p: (typeof linkedProfiles)[number]) => p.id);

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        sub: true,
      },
    });

    if (!task || !profileIds.includes(task.subId)) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();

    const allowedStatuses = ["SUBMITTED", "NOT_STARTED"];
    const isDeclining = body.status === "PENDING" && body.declineReason;

    if (!allowedStatuses.includes(body.status) && !isDeclining) {
      return NextResponse.json(
        { error: "Invalid status change" },
        { status: 400 }
      );
    }

    // Accept: PENDING → NOT_STARTED
    if (body.status === "NOT_STARTED") {
      if (task.status !== "PENDING") {
        return NextResponse.json(
          { error: "Can only accept a pending task request" },
          { status: 400 }
        );
      }

      const updatedTask = await prisma.task.update({
        where: { id },
        data: { status: "NOT_STARTED", declineReason: null },
      });

      if (task.userId) {
        await prisma.notification.create({
          data: {
            userId: task.userId,
            type: "TASK_UPDATED",
            message: `Task request accepted: ${task.title}`,
            linkUrl: `/tasks/${task.id}`,
            taskId: task.id,
          },
        });
      }

      return NextResponse.json(updatedTask);
    }

    // Decline: set declineReason, keep status PENDING
    if (isDeclining) {
      if (task.status !== "PENDING") {
        return NextResponse.json(
          { error: "Can only decline a pending task request" },
          { status: 400 }
        );
      }

      const updatedTask = await prisma.task.update({
        where: { id },
        data: { declineReason: body.declineReason },
      });

      if (task.userId) {
        await prisma.notification.create({
          data: {
            userId: task.userId,
            type: "TASK_DECLINED",
            message: `Task request declined: ${task.title}`,
            linkUrl: `/tasks/${task.id}`,
            taskId: task.id,
          },
        });
      }

      return NextResponse.json(updatedTask);
    }

    // Submit: existing flow
    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status: "SUBMITTED" },
    });

    if (task.userId) {
      await prisma.notification.create({
        data: {
          userId: task.userId,
          type: "TASK_SUBMITTED",
          message: `Task submitted for review: ${task.title}`,
          linkUrl: `/tasks/${task.id}`,
          taskId: task.id,
        },
      });
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error updating my task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
