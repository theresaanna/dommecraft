import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteBlob } from "@/lib/blob-helpers";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, photoId } = await params;

    if (session.user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const photo = await prisma.galleryPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo || photo.userId !== id) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      );
    }

    await deleteBlob(photo.fileUrl);
    await prisma.galleryPhoto.delete({ where: { id: photoId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting gallery photo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
