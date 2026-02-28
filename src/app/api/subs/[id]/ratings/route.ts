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

    const ratings = await prisma.rating.findMany({
      where: { subId: id, userId: session.user.id },
      orderBy: { ratedAt: "desc" },
    });

    return NextResponse.json(ratings);
  } catch (error) {
    console.error("Error listing ratings:", error);
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
        { error: "Overall rating is required and must be a number" },
        { status: 400 }
      );
    }

    if (body.overall < 1 || body.overall > 10) {
      return NextResponse.json(
        { error: "Overall rating must be between 1 and 10" },
        { status: 400 }
      );
    }

    const rating = await prisma.rating.create({
      data: {
        userId: session.user.id,
        subId: id,
        overall: body.overall,
        categories: body.categories || null,
        notes: body.notes || null,
        ratedAt: body.ratedAt ? new Date(body.ratedAt) : new Date(),
      },
    });

    return NextResponse.json(rating, { status: 201 });
  } catch (error) {
    console.error("Error creating rating:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
