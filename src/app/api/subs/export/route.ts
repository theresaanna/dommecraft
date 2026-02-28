import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";
import { jsPDF } from "jspdf";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subIds, format } = body;

    if (!Array.isArray(subIds) || subIds.length === 0) {
      return NextResponse.json(
        { error: "subIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (format !== "pdf" && format !== "csv") {
      return NextResponse.json(
        { error: "format must be 'pdf' or 'csv'" },
        { status: 400 }
      );
    }

    const subs = await prisma.subProfile.findMany({
      where: {
        id: { in: subIds },
        userId: session.user.id,
      },
    });

    if (subs.length === 0) {
      return NextResponse.json(
        { error: "No matching sub profiles found" },
        { status: 404 }
      );
    }

    if (format === "csv") {
      return generateCsv(subs);
    }

    return generatePdf(subs);
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function generateCsv(subs: Record<string, unknown>[]) {
  const rows = subs.map((sub) => ({
    fullName: sub.fullName,
    contactInfo: sub.contactInfo || "",
    arrangementType: (sub.arrangementType as string[]).join("; "),
    subType: (sub.subType as string[]).join("; "),
    timezone: sub.timezone || "",
    softLimits: (sub.softLimits as string[]).join("; "),
    hardLimits: (sub.hardLimits as string[]).join("; "),
    tags: (sub.tags as string[]).join("; "),
    country: sub.country || "",
    occupation: sub.occupation || "",
    birthday: sub.birthday ? new Date(sub.birthday as string).toLocaleDateString() : "",
    workSchedule: sub.workSchedule || "",
    financialLimits: sub.financialLimits || "",
    expendableIncome: sub.expendableIncome || "",
    preferences: (sub.preferences as string[]).join("; "),
    bestExperiences: sub.bestExperiences || "",
    worstExperiences: sub.worstExperiences || "",
    personalityNotes: sub.personalityNotes || "",
    healthNotes: sub.healthNotes || "",
    obedienceHistory: sub.obedienceHistory || "",
    privateNotes: sub.privateNotes || "",
    createdAt: sub.createdAt
      ? new Date(sub.createdAt as string).toLocaleDateString()
      : "",
  }));

  const csv = Papa.unparse(rows);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="subs-export.csv"',
    },
  });
}

function generatePdf(subs: Record<string, unknown>[]) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;

  subs.forEach((sub, index) => {
    if (index > 0) {
      doc.addPage();
    }

    let y = 20;

    // Name header
    doc.setFontSize(18);
    doc.text(sub.fullName as string, margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Sub Profile Export", margin, y);
    doc.setTextColor(0);
    y += 12;

    // Helper to add a field
    const addField = (label: string, value: string | null | undefined) => {
      if (!value) return;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(label, margin, y);
      y += 5;
      doc.setFontSize(10);
      doc.setTextColor(0);
      const lines = doc.splitTextToSize(value, maxWidth);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 4;
    };

    const addArrayField = (label: string, values: string[]) => {
      if (values.length === 0) return;
      addField(label, values.join(", "));
    };

    // Main fields
    addField("Contact Info", sub.contactInfo as string);
    addArrayField("Arrangement Type", sub.arrangementType as string[]);
    addArrayField("Sub Type", sub.subType as string[]);
    addField("Timezone", sub.timezone as string);
    addArrayField("Soft Limits", sub.softLimits as string[]);
    addArrayField("Hard Limits", sub.hardLimits as string[]);
    addArrayField("Tags", sub.tags as string[]);

    // Advanced fields
    if (sub.birthday) {
      addField(
        "Birthday",
        new Date(sub.birthday as string).toLocaleDateString()
      );
    }
    addField("Country", sub.country as string);
    addField("Occupation", sub.occupation as string);
    addField("Work Schedule", sub.workSchedule as string);
    addField("Financial Limits", sub.financialLimits as string);
    addField("Expendable Income", sub.expendableIncome as string);
    addArrayField("Preferences", sub.preferences as string[]);
    addField("Best Experiences", sub.bestExperiences as string);
    addField("Worst Experiences", sub.worstExperiences as string);
    addField("Personality Notes", sub.personalityNotes as string);
    addField("Health Notes", sub.healthNotes as string);
    addField("Obedience History", sub.obedienceHistory as string);
    addField("Private Notes", sub.privateNotes as string);
  });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="subs-export.pdf"',
    },
  });
}
