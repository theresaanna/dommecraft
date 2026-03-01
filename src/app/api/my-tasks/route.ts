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

    // Find SubProfiles linked to this user
    const linkedProfiles = await prisma.subProfile.findMany({
      where: { linkedUserId: session.user.id },
      select: { id: true },
    });

    if (linkedProfiles.length === 0) {
      return NextResponse.json([]);
    }

    const subProfileIds = linkedProfiles.map((p) => p.id);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Prisma.TaskWhereInput = {
      subId: { in: subProfileIds },
    };

    if (status) {
      where.status = status as Prisma.EnumTaskStatusFilter;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { deadline: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      include: {
        sub: {
          select: { id: true, fullName: true },
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
    console.error("Error listing my tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
