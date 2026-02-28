import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const timeRange = searchParams.get("time_range");
    const subId = searchParams.get("sub_id");
    const categories = searchParams.getAll("category");
    const paymentMethods = searchParams.getAll("payment_method");
    const isInApp = searchParams.get("is_in_app");
    const sort = searchParams.get("sort") || "date";
    const order = searchParams.get("order") || "desc";

    const where: Prisma.FinancialEntryWhereInput = {
      userId: session.user.id,
    };

    // Date range filtering
    if (dateFrom || dateTo) {
      where.date = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    } else if (timeRange) {
      const now = new Date();
      let start: Date | undefined;
      if (timeRange === "day") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (timeRange === "week") {
        start = new Date(now);
        start.setDate(start.getDate() - 7);
      } else if (timeRange === "month") {
        start = new Date(now);
        start.setMonth(start.getMonth() - 1);
      } else if (timeRange === "year") {
        start = new Date(now);
        start.setFullYear(start.getFullYear() - 1);
      }
      if (start) {
        where.date = { gte: start };
      }
    }

    // Sub filter
    if (subId === "unlinked") {
      where.subId = null;
    } else if (subId) {
      where.subId = subId;
    }

    // Category filter
    if (categories.length > 0) {
      where.category = { in: categories };
    }

    // Payment method filter
    if (paymentMethods.length > 0) {
      where.paymentMethod = { in: paymentMethods };
    }

    // In-app filter
    if (isInApp === "true") {
      where.isInApp = true;
    } else if (isInApp === "false") {
      where.isInApp = false;
    }

    const validSortFields = ["date", "amount", "createdAt"];
    const sortField = validSortFields.includes(sort) ? sort : "date";
    const sortOrder = order === "asc" ? "asc" : "desc";

    const entries = await prisma.financialEntry.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      include: {
        sub: {
          select: { id: true, fullName: true },
        },
      },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error listing financial entries:", error);
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

    if (body.amount === undefined || body.amount === null || typeof body.amount !== "number" || body.amount <= 0) {
      return NextResponse.json(
        { error: "Amount is required and must be a positive number" },
        { status: 400 }
      );
    }

    if (!body.category || typeof body.category !== "string" || body.category.trim() === "") {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    // Verify sub ownership if subId is provided
    if (body.subId) {
      const sub = await prisma.subProfile.findUnique({
        where: { id: body.subId, userId: session.user.id },
        select: { id: true },
      });
      if (!sub) {
        return NextResponse.json(
          { error: "Sub profile not found" },
          { status: 404 }
        );
      }
    }

    const entry = await prisma.financialEntry.create({
      data: {
        userId: session.user.id,
        amount: body.amount,
        currency: body.currency || "USD",
        category: body.category.trim(),
        paymentMethod: body.paymentMethod || null,
        notes: body.notes || null,
        date: body.date ? new Date(body.date) : new Date(),
        isInApp: body.isInApp !== undefined ? body.isInApp : true,
        subId: body.subId || null,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Error creating financial entry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
