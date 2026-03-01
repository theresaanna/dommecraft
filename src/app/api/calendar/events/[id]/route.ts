import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
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

    const existing = await prisma.calendarEvent.findUnique({
      where: { id, userId: session.user.id },
      select: { id: true, sourceType: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Calendar event not found" },
        { status: 404 }
      );
    }

    if (existing.sourceType !== "STANDALONE") {
      return NextResponse.json(
        { error: "Cannot directly modify task or reminder events" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.startAt !== undefined && { startAt: new Date(body.startAt) }),
        ...(body.endAt !== undefined && {
          endAt: body.endAt ? new Date(body.endAt) : null,
        }),
        ...(body.isAllDay !== undefined && { isAllDay: body.isAllDay }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.recurrenceRule !== undefined && {
          recurrenceRule: body.recurrenceRule,
        }),
        ...(body.timezone !== undefined && { timezone: body.timezone }),
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("Error updating calendar event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const existing = await prisma.calendarEvent.findUnique({
      where: { id, userId: session.user.id },
      select: { id: true, sourceType: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Calendar event not found" },
        { status: 404 }
      );
    }

    if (existing.sourceType !== "STANDALONE") {
      return NextResponse.json(
        { error: "Cannot directly delete task or reminder events" },
        { status: 400 }
      );
    }

    await prisma.calendarEvent.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
