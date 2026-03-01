import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { expandEvents } from "@/lib/calendar-utils";
import { createNotification } from "@/lib/notifications";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DOMME") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    if (!startParam || !endParam) {
      return NextResponse.json(
        { error: "start and end query parameters are required" },
        { status: 400 }
      );
    }

    const rangeStart = new Date(startParam);
    const rangeEnd = new Date(endParam);

    if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format for start or end" },
        { status: 400 }
      );
    }

    const events = await prisma.calendarEvent.findMany({
      where: {
        userId: session.user.id,
        OR: [
          {
            recurrenceRule: null,
            startAt: { lte: rangeEnd },
          },
          {
            recurrenceRule: { not: null },
          },
        ],
      },
      orderBy: { startAt: "asc" },
    });

    const expanded = expandEvents(events, rangeStart, rangeEnd);

    return NextResponse.json(expanded);
  } catch (error) {
    console.error("Error listing calendar events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DOMME") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    if (
      !body.title ||
      typeof body.title !== "string" ||
      body.title.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!body.startAt) {
      return NextResponse.json(
        { error: "Start date is required" },
        { status: 400 }
      );
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId: session.user.id,
        title: body.title.trim(),
        description: body.description || null,
        startAt: new Date(body.startAt),
        endAt: body.endAt ? new Date(body.endAt) : null,
        isAllDay: body.isAllDay || false,
        color: body.color || null,
        category: body.category || null,
        recurrenceRule: body.recurrenceRule || null,
        sourceType: "STANDALONE",
        timezone: body.timezone || "UTC",
      },
    });

    await createNotification({
      userId: session.user.id,
      type: "CALENDAR_REMINDER",
      message: `Upcoming event: ${body.title.trim()}`,
      linkUrl: "/calendar",
      calendarEventId: event.id,
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Error creating calendar event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
