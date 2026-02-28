import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifySubOwnership } from "@/lib/api-helpers";

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

    const isOwner = await verifySubOwnership(id, session.user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Sub profile not found" },
        { status: 404 }
      );
    }

    const scores = await prisma.behaviorScore.findMany({
      where: { subId: id, userId: session.user.id },
      orderBy: { scoredAt: "desc" },
    });

    return NextResponse.json(scores);
  } catch (error) {
    console.error("Error listing behavior scores:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const isOwner = await verifySubOwnership(id, session.user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Sub profile not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    if (body.overall === undefined || typeof body.overall !== "number") {
      return NextResponse.json(
        { error: "Overall score is required and must be a number" },
        { status: 400 }
      );
    }

    const score = await prisma.behaviorScore.create({
      data: {
        userId: session.user.id,
        subId: id,
        overall: body.overall,
        breakdown: body.breakdown || null,
        notes: body.notes || null,
        scoredAt: body.scoredAt ? new Date(body.scoredAt) : new Date(),
      },
    });

    return NextResponse.json(score, { status: 201 });
  } catch (error) {
    console.error("Error creating behavior score:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
