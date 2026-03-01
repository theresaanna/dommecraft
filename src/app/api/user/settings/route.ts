import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteBlob } from "@/lib/blob-helpers";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        avatarUrl: true,
        theme: true,
        calendarDefaultView: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error getting user settings:", error);
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

    // If avatarUrl is being changed, delete the old blob
    if (body.avatarUrl !== undefined) {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { avatarUrl: true },
      });
      if (currentUser?.avatarUrl && currentUser.avatarUrl !== body.avatarUrl) {
        await deleteBlob(currentUser.avatarUrl);
      }
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
        ...(body.theme !== undefined && { theme: body.theme }),
        ...(body.calendarDefaultView !== undefined && {
          calendarDefaultView: body.calendarDefaultView,
        }),
      },
      select: {
        name: true,
        email: true,
        avatarUrl: true,
        theme: true,
        calendarDefaultView: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
