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

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const subType = searchParams.getAll("sub_type");
    const arrangementType = searchParams.getAll("arrangement_type");
    const tags = searchParams.getAll("tags");
    const sort = searchParams.get("sort") || "createdAt";
    const order = searchParams.get("order") || "desc";
    const includeArchived = searchParams.get("include_archived") === "true";

    const where: Prisma.SubProfileWhereInput = {
      userId: session.user.id,
      ...(!includeArchived && { isArchived: false }),
    };

    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { contactInfo: { contains: q, mode: "insensitive" } },
        { privateNotes: { contains: q, mode: "insensitive" } },
      ];
    }

    if (subType.length > 0) {
      where.subType = { hasSome: subType };
    }

    if (arrangementType.length > 0) {
      where.arrangementType = { hasSome: arrangementType };
    }

    if (tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    const validSortFields = [
      "createdAt",
      "updatedAt",
      "fullName",
    ];
    const sortField = validSortFields.includes(sort) ? sort : "createdAt";
    const sortOrder = order === "asc" ? "asc" : "desc";

    const subs = await prisma.subProfile.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      select: {
        id: true,
        fullName: true,
        contactInfo: true,
        arrangementType: true,
        subType: true,
        timezone: true,
        tags: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(subs);
  } catch (error) {
    console.error("Error listing subs:", error);
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

    const body = await request.json();
    const { fullName } = body;

    if (!fullName || typeof fullName !== "string" || fullName.trim() === "") {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 }
      );
    }

    const sub = await prisma.subProfile.create({
      data: {
        userId: session.user.id,
        fullName: fullName.trim(),
        contactInfo: body.contactInfo || null,
        arrangementType: Array.isArray(body.arrangementType)
          ? body.arrangementType
          : [],
        subType: Array.isArray(body.subType) ? body.subType : [],
        timezone: body.timezone || null,
        softLimits: Array.isArray(body.softLimits) ? body.softLimits : [],
        hardLimits: Array.isArray(body.hardLimits) ? body.hardLimits : [],
        birthday: body.birthday ? new Date(body.birthday) : null,
        country: body.country || null,
        occupation: body.occupation || null,
        workSchedule: body.workSchedule || null,
        financialLimits: body.financialLimits || null,
        expendableIncome: body.expendableIncome || null,
        preferences: Array.isArray(body.preferences) ? body.preferences : [],
        bestExperiences: body.bestExperiences || null,
        worstExperiences: body.worstExperiences || null,
        personalityNotes: body.personalityNotes || null,
        healthNotes: body.healthNotes || null,
        obedienceHistory: body.obedienceHistory || null,
        avatarUrl: body.avatarUrl || null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        privateNotes: body.privateNotes || null,
      },
    });

    return NextResponse.json(sub, { status: 201 });
  } catch (error) {
    console.error("Error creating sub:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
