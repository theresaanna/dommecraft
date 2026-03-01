import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifySubOwnership } from "@/lib/api-helpers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DOMME") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const isOwner = await verifySubOwnership(id, session.user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Sub profile not found" },
        { status: 404 }
      );
    }

    const inviteCode = randomBytes(4).toString("hex");

    await prisma.subProfile.update({
      where: { id },
      data: { inviteCode },
    });

    return NextResponse.json({ inviteCode });
  } catch (error) {
    console.error("Error generating invite code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
