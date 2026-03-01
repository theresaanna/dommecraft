"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import FinancialEntryForm from "../FinancialEntryForm";

type AvailableSub = {
  id: string;
  fullName: string;
};

export default function NewFinancialEntryPageClient({
  availableSubs,
}: {
  availableSubs: AvailableSub[];
}) {
  const router = useRouter();

  return (
    <>
      <div className="mb-4">
        <Link
          href="/financials"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          &larr; All Financials
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        New Entry
      </h1>
      <div className="mt-6">
        <FinancialEntryForm
          subs={availableSubs}
          onClose={() => router.push("/financials")}
        />
      </div>
    </>
  );
}
