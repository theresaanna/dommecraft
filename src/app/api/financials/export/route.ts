import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";
import { jsPDF } from "jspdf";
import { Prisma } from "@prisma/client";

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
    const { format, filters } = body;

    if (format !== "pdf" && format !== "csv") {
      return NextResponse.json(
        { error: "format must be 'pdf' or 'csv'" },
        { status: 400 }
      );
    }

    // Build where clause from filters
    const where: Prisma.FinancialEntryWhereInput = {
      userId: session.user.id,
    };

    if (filters) {
      if (filters.date_from || filters.date_to) {
        where.date = {
          ...(filters.date_from && { gte: new Date(filters.date_from) }),
          ...(filters.date_to && { lte: new Date(filters.date_to) }),
        };
      }

      if (filters.sub_id === "unlinked") {
        where.subId = null;
      } else if (filters.sub_id) {
        where.subId = filters.sub_id;
      }

      if (Array.isArray(filters.category) && filters.category.length > 0) {
        where.category = { in: filters.category };
      }

      if (
        Array.isArray(filters.payment_method) &&
        filters.payment_method.length > 0
      ) {
        where.paymentMethod = { in: filters.payment_method };
      }

      if (filters.is_in_app === "true") {
        where.isInApp = true;
      } else if (filters.is_in_app === "false") {
        where.isInApp = false;
      }
    }

    const entries = await prisma.financialEntry.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        sub: {
          select: { id: true, fullName: true },
        },
      },
    });

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "No matching financial entries found" },
        { status: 404 }
      );
    }

    if (format === "csv") {
      return generateCsv(entries);
    }

    return generatePdf(entries);
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function generateCsv(entries: Record<string, unknown>[]) {
  const rows = entries.map((entry) => ({
    date: new Date(entry.date as string).toLocaleDateString(),
    amount: String(entry.amount),
    currency: entry.currency as string,
    category: entry.category as string,
    paymentMethod: (entry.paymentMethod as string) || "",
    sub: (entry.sub as { fullName: string } | null)?.fullName || "Unlinked",
    notes: (entry.notes as string) || "",
    inApp: (entry.isInApp as boolean) ? "Yes" : "No",
  }));

  const csv = Papa.unparse(rows);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="financials-export.csv"',
    },
  });
}

function generatePdf(entries: Record<string, unknown>[]) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;

  // Title
  doc.setFontSize(18);
  doc.text("Financial Entries Export", margin, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Generated ${new Date().toLocaleDateString()} — ${entries.length} entries`,
    margin,
    28
  );
  doc.setTextColor(0);

  let y = 40;

  entries.forEach((entry) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    const date = new Date(entry.date as string).toLocaleDateString();
    const amount = `$${String(entry.amount)}`;
    const category = entry.category as string;
    const sub =
      (entry.sub as { fullName: string } | null)?.fullName || "Unlinked";
    const method = (entry.paymentMethod as string) || "—";

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${date}  |  ${amount}  |  ${category}`, margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Sub: ${sub}  |  Method: ${method}`, margin, y);
    doc.setTextColor(0);
    y += 5;

    if (entry.notes) {
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(entry.notes as string, maxWidth);
      doc.text(lines, margin, y);
      y += lines.length * 4;
    }

    y += 4;
  });

  // Summary
  const total = entries.reduce(
    (sum, e) => sum + parseFloat(String(e.amount)),
    0
  );
  if (y > 260) {
    doc.addPage();
    y = 20;
  }
  y += 6;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Total: $${total.toFixed(2)}`, margin, y);

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="financials-export.pdf"',
    },
  });
}
