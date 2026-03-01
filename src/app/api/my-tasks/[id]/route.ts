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

    // SUB can ONLY change status to "SUBMITTED"
    if (body.status !== "SUBMITTED") {
      return NextResponse.json(
        { error: "Only status change to SUBMITTED is allowed" },
        { status: 400 }
      );
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: "SUBMITTED",
      },
    });

    // Create notification for the DOMME
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
