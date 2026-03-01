import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DOMME") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const calendars = await prisma.externalCalendar.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        provider: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(calendars);
  } catch (error) {
    console.error("Error fetching sync status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
