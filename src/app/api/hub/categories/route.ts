import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  { name: "Content Creation Ideas", sortOrder: 0 },
  { name: "Contract Ideas", sortOrder: 1 },
  { name: "Session Ideas", sortOrder: 2 },
  { name: "General", sortOrder: 3 },
];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DOMME") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let categories = await prisma.category.findMany({
      where: { userId: session.user.id },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });

    // Auto-create default categories if none exist
    if (categories.length === 0) {
      await prisma.$transaction(
        DEFAULT_CATEGORIES.map((cat) =>
          prisma.category.create({
            data: {
              userId: session.user.id,
              name: cat.name,
              sortOrder: cat.sortOrder,
            },
          })
        )
      );

      categories = await prisma.category.findMany({
        where: { userId: session.user.id },
        orderBy: { sortOrder: "asc" },
        include: {
          _count: {
            select: { projects: true },
          },
        },
      });
    }

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
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
      !body.name ||
      typeof body.name !== "string" ||
      body.name.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    const maxOrder = await prisma.category.findFirst({
      where: { userId: session.user.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const category = await prisma.category.create({
      data: {
        userId: session.user.id,
        name: body.name.trim(),
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
