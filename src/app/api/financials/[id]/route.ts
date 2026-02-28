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

    const existing = await prisma.financialEntry.findUnique({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Financial entry not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Verify sub ownership if subId is being changed to a non-null value
    if (body.subId !== undefined && body.subId !== null) {
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

    const entry = await prisma.financialEntry.update({
      where: { id },
      data: {
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.paymentMethod !== undefined && {
          paymentMethod: body.paymentMethod,
        }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.date !== undefined && { date: new Date(body.date) }),
        ...(body.isInApp !== undefined && { isInApp: body.isInApp }),
        ...(body.subId !== undefined && { subId: body.subId }),
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error updating financial entry:", error);
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

    const existing = await prisma.financialEntry.findUnique({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Financial entry not found" },
        { status: 404 }
      );
    }

    await prisma.financialEntry.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting financial entry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
