import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NewFinancialEntryPageClient from "./NewFinancialEntryPageClient";

export default async function NewFinancialEntryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "DOMME") {
    redirect("/dashboard");
  }

  const availableSubs = await prisma.subProfile.findMany({
    where: { userId: session.user.id, isArchived: false },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <NewFinancialEntryPageClient availableSubs={availableSubs} />
    </div>
  );
}
