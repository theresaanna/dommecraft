import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all");

    const where = {
      userId: session.user.id,
      ...(all !== "true" && { isRead: false }),
    };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (body.markAll === true) {
      const result = await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false,
        },
        data: { isRead: true },
      });
      return NextResponse.json({ updated: result.count });
    }

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { error: "ids array is required" },
        { status: 400 }
      );
    }

    const result = await prisma.notification.updateMany({
      where: {
        id: { in: body.ids },
        userId: session.user.id,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
