import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subs = await prisma.subProfile.findMany({
      select: {
        tags: true,
        softLimits: true,
        hardLimits: true,
      },
    });

    const tags = new Set<string>();
    const softLimits = new Set<string>();
    const hardLimits = new Set<string>();

    for (const sub of subs) {
      for (const t of sub.tags) tags.add(t);
      for (const l of sub.softLimits) softLimits.add(l);
      for (const l of sub.hardLimits) hardLimits.add(l);
    }

    return NextResponse.json({
      tags: [...tags].sort(),
      softLimits: [...softLimits].sort(),
      hardLimits: [...hardLimits].sort(),
    });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
