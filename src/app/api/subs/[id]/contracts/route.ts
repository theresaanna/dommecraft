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

    const contracts = await prisma.contract.findMany({
      where: { subId: id, userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(contracts);
  } catch (error) {
    console.error("Error listing contracts:", error);
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

    if (!body.title || typeof body.title !== "string" || body.title.trim() === "") {
      return NextResponse.json(
        { error: "Contract title is required" },
        { status: 400 }
      );
    }

    if (!body.content || typeof body.content !== "string" || body.content.trim() === "") {
      return NextResponse.json(
        { error: "Contract content is required" },
        { status: 400 }
      );
    }

    const contract = await prisma.contract.create({
      data: {
        userId: session.user.id,
        subId: id,
        title: body.title.trim(),
        content: body.content,
        status: body.status || "DRAFT",
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        fileUrl: body.fileUrl || null,
      },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    console.error("Error creating contract:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
