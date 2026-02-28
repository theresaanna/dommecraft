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

    const mediaItems = await prisma.mediaItem.findMany({
      where: { subId: id, userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(mediaItems);
  } catch (error) {
    console.error("Error listing media:", error);
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

    if (!body.fileUrl || typeof body.fileUrl !== "string") {
      return NextResponse.json(
        { error: "File URL is required" },
        { status: 400 }
      );
    }

    if (!body.fileType || typeof body.fileType !== "string") {
      return NextResponse.json(
        { error: "File type is required" },
        { status: 400 }
      );
    }

    const mediaItem = await prisma.mediaItem.create({
      data: {
        userId: session.user.id,
        subId: id,
        title: body.title || null,
        description: body.description || null,
        fileUrl: body.fileUrl,
        fileType: body.fileType,
        mimeType: body.mimeType || null,
        fileSize: body.fileSize || null,
        tags: Array.isArray(body.tags) ? body.tags : [],
      },
    });

    return NextResponse.json(mediaItem, { status: 201 });
  } catch (error) {
    console.error("Error creating media item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
