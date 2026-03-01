import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

    const existing = await prisma.subtask.findUnique({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Subtask not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const subtask = await prisma.subtask.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.isCompleted !== undefined && { isCompleted: body.isCompleted }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });

    return NextResponse.json(subtask);
  } catch (error) {
    console.error("Error updating subtask:", error);
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

    const existing = await prisma.subtask.findUnique({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Subtask not found" },
        { status: 404 }
      );
    }

    await prisma.subtask.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting subtask:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
