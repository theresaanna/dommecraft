import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { id } = await params;

  const friendship = await prisma.friendship.findUnique({
    where: { id },
  });

  if (
    !friendship ||
    (friendship.requesterId !== userId && friendship.addresseeId !== userId)
  ) {
    return NextResponse.json(
      { error: "Friendship not found" },
      { status: 404 }
    );
  }

  await prisma.friendship.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
