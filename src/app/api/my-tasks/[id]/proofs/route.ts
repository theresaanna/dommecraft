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

    const { id } = await params;

    // Find SubProfiles linked to this user
    const linkedProfiles = await prisma.subProfile.findMany({
      where: { linkedUserId: session.user.id },
      select: { id: true },
    });
    const profileIds = linkedProfiles.map((p) => p.id);

    const task = await prisma.task.findUnique({
      where: { id },
      select: { id: true, subId: true },
    });

    if (!task || !profileIds.includes(task.subId)) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();

    if (!body.fileUrl || typeof body.fileUrl !== "string") {
      return NextResponse.json(
        { error: "fileUrl is required" },
        { status: 400 }
      );
    }

    if (!body.fileType || typeof body.fileType !== "string") {
      return NextResponse.json(
        { error: "fileType is required" },
        { status: 400 }
      );
    }

    const proof = await prisma.taskProof.create({
      data: {
        userId: session.user.id,
        taskId: id,
        fileUrl: body.fileUrl,
        fileType: body.fileType,
        mimeType: body.mimeType || null,
        fileSize: body.fileSize || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(proof, { status: 201 });
  } catch (error) {
    console.error("Error creating proof:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
