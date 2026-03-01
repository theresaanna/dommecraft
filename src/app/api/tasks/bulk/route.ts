import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

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

    const validActions = ["complete", "archive", "delete"];
    if (!body.action || !validActions.includes(body.action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be one of: complete, archive, delete" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.taskIds) || body.taskIds.length === 0) {
      return NextResponse.json(
        { error: "taskIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // Verify all tasks belong to user
    const foundTasks = await prisma.task.findMany({
      where: { id: { in: body.taskIds }, userId: session.user.id },
      select: { id: true },
    });

    if (foundTasks.length !== body.taskIds.length) {
      return NextResponse.json(
        { error: "One or more tasks not found or do not belong to you" },
        { status: 400 }
      );
    }

    const whereClause = { id: { in: body.taskIds }, userId: session.user.id };

    switch (body.action) {
      case "complete": {
        await prisma.task.updateMany({
          where: whereClause,
          data: { status: "COMPLETED", completedAt: new Date() },
        });

        // Notify each sub that their task was completed
        const completedTasks = await prisma.task.findMany({
          where: { id: { in: body.taskIds } },
          select: { id: true, title: true, sub: { select: { linkedUserId: true } } },
        });

        await Promise.all(
          completedTasks
            .filter((t) => t.sub.linkedUserId)
            .map((t) =>
              createNotification({
                userId: t.sub.linkedUserId!,
                type: "TASK_COMPLETED",
                message: `Task approved: ${t.title}`,
                linkUrl: `/my-tasks/${t.id}`,
                taskId: t.id,
              })
            )
        );
        break;
      }

      case "archive":
        await prisma.task.updateMany({
          where: whereClause,
          data: { status: "ARCHIVED" },
        });
        break;

      case "delete":
        await prisma.task.deleteMany({
          where: whereClause,
        });
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error performing bulk action:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
