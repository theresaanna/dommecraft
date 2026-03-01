import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; depId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DOMME") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, depId } = await params;

    // Verify the dependency exists and the parent task belongs to user
    const dependency = await prisma.taskDependency.findUnique({
      where: { id: depId },
      include: {
        task: {
          select: { userId: true },
        },
      },
    });

    if (!dependency) {
      return NextResponse.json(
        { error: "Dependency not found" },
        { status: 404 }
      );
    }

    if (dependency.task.userId !== session.user.id || dependency.taskId !== id) {
      return NextResponse.json(
        { error: "Dependency not found" },
        { status: 404 }
      );
    }

    await prisma.taskDependency.delete({ where: { id: depId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting dependency:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
