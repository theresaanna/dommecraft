import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const [tasks, subs, media] = await Promise.all([
      prisma.task.findMany({
        where: { userId },
        select: { tags: true },
      }),
      prisma.subProfile.findMany({
        where: { userId },
        select: { tags: true, softLimits: true, hardLimits: true },
      }),
      prisma.mediaItem.findMany({
        where: { userId },
        select: { tags: true },
      }),
    ]);

    const tags = new Set<string>();
    for (const item of [...tasks, ...subs, ...media]) {
      for (const t of item.tags) tags.add(t);
    }
    for (const sub of subs) {
      for (const t of sub.softLimits) tags.add(t);
      for (const t of sub.hardLimits) tags.add(t);
    }

    return NextResponse.json({ tags: [...tags].sort() });
  } catch (error) {
    console.error("Error fetching tag suggestions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
