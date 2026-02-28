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

    const badges = await prisma.badge.findMany({
      where: { subId: id, userId: session.user.id },
      orderBy: { earnedAt: "desc" },
    });

    return NextResponse.json(badges);
  } catch (error) {
    console.error("Error listing badges:", error);
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

    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json(
        { error: "Badge name is required" },
        { status: 400 }
      );
    }

    const badge = await prisma.badge.create({
      data: {
        userId: session.user.id,
        subId: id,
        name: body.name.trim(),
        description: body.description || null,
        icon: body.icon || null,
        color: body.color || null,
        earnedAt: body.earnedAt ? new Date(body.earnedAt) : new Date(),
      },
    });

    return NextResponse.json(badge, { status: 201 });
  } catch (error) {
    console.error("Error creating badge:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
