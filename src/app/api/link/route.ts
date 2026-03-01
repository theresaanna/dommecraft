import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUB") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { inviteCode } = body;

    if (!inviteCode || typeof inviteCode !== "string") {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 }
      );
    }

    const subProfile = await prisma.subProfile.findUnique({
      where: { inviteCode },
    });

    if (!subProfile) {
      return NextResponse.json(
        { error: "Invite code not found" },
        { status: 404 }
      );
    }

    if (subProfile.linkedUserId) {
      return NextResponse.json(
        { error: "Already linked" },
        { status: 400 }
      );
    }

    const updated = await prisma.subProfile.update({
      where: { id: subProfile.id },
      data: {
        linkedUserId: session.user.id,
        inviteCode: null,
      },
    });

    if (subProfile.userId) {
      await createNotification({
        userId: subProfile.userId,
        type: "SUB_JOINED",
        message: `${subProfile.fullName} has linked their account`,
        linkUrl: `/subs/${subProfile.id}`,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error linking sub profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
