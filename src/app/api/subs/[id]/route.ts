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

    const sub = await prisma.subProfile.findUnique({
      where: { id, userId: session.user.id },
      include: {
        _count: {
          select: {
            badges: true,
            mediaItems: true,
            ratings: true,
            behaviorScores: true,
            contracts: true,
          },
        },
      },
    });

    if (!sub) {
      return NextResponse.json(
        { error: "Sub profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(sub);
  } catch (error) {
    console.error("Error getting sub:", error);
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

    const existing = await prisma.subProfile.findUnique({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Sub profile not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const sub = await prisma.subProfile.update({
      where: { id },
      data: {
        ...(body.fullName !== undefined && { fullName: body.fullName }),
        ...(body.contactInfo !== undefined && {
          contactInfo: body.contactInfo,
        }),
        ...(body.arrangementType !== undefined && {
          arrangementType: body.arrangementType,
        }),
        ...(body.subType !== undefined && { subType: body.subType }),
        ...(body.timezone !== undefined && { timezone: body.timezone }),
        ...(body.softLimits !== undefined && { softLimits: body.softLimits }),
        ...(body.hardLimits !== undefined && { hardLimits: body.hardLimits }),
        ...(body.birthday !== undefined && {
          birthday: body.birthday ? new Date(body.birthday) : null,
        }),
        ...(body.country !== undefined && { country: body.country }),
        ...(body.occupation !== undefined && { occupation: body.occupation }),
        ...(body.workSchedule !== undefined && {
          workSchedule: body.workSchedule,
        }),
        ...(body.financialLimits !== undefined && {
          financialLimits: body.financialLimits,
        }),
        ...(body.expendableIncome !== undefined && {
          expendableIncome: body.expendableIncome,
        }),
        ...(body.preferences !== undefined && {
          preferences: body.preferences,
        }),
        ...(body.bestExperiences !== undefined && {
          bestExperiences: body.bestExperiences,
        }),
        ...(body.worstExperiences !== undefined && {
          worstExperiences: body.worstExperiences,
        }),
        ...(body.personalityNotes !== undefined && {
          personalityNotes: body.personalityNotes,
        }),
        ...(body.healthNotes !== undefined && {
          healthNotes: body.healthNotes,
        }),
        ...(body.obedienceHistory !== undefined && {
          obedienceHistory: body.obedienceHistory,
        }),
        ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.privateNotes !== undefined && {
          privateNotes: body.privateNotes,
        }),
        ...(body.isArchived !== undefined && { isArchived: body.isArchived }),
      },
    });

    return NextResponse.json(sub);
  } catch (error) {
    console.error("Error updating sub:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.subProfile.findUnique({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Sub profile not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    if (permanent) {
      await prisma.subProfile.delete({ where: { id } });
    } else {
      await prisma.subProfile.update({
        where: { id },
        data: { isArchived: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sub:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
