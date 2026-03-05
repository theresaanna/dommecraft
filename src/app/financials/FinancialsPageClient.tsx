"use client";

import Link from "next/link";
import FinancialsFilters from "./FinancialsFilters";
import FinancialsSummary from "./FinancialsSummary";
import FinancialsList from "./FinancialsList";
import type { CurrencyCode } from "@/lib/currency";

type AvailableSub = {
  id: string;
  fullName: string;
};

type FinancialEntry = {
  id: string;
  amount: string;
  category: string;
  paymentMethod: string | null;
  notes: string | null;
  date: string;
  isInApp: boolean;
  sub: { id: string; fullName: string } | null;
  subId: string | null;
};

type SummaryData = {
  total: string | number;
  average: string | number;
  count: number;
  perSub: {
    subId: string | null;
    subName: string;
    total: string | number;
    count: number;
  }[];
  byCategory: {
    category: string;
    total: string | number;
    count: number;
  }[];
};

type FilterParams = {
  time_range: string;
  date_from: string;
  date_to: string;
  sub_id: string;
  category: string[];
  payment_method: string[];
  is_in_app: string;
  sort: string;
  order: string;
};

export default function FinancialsPageClient({
  entries,
  summary,
  availableSubs,
  currentParams,
  currency,
}: {
  entries: FinancialEntry[];
  summary: SummaryData;
  availableSubs: AvailableSub[];
  currentParams: FilterParams;
  currency: CurrencyCode;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Financial Tracking
        </h1>
        <Link
          href="/financials/new"
          className="rounded-md bg-sky-300/30 backdrop-blur-sm border border-sky-400/30 px-4 py-2 text-base font-medium text-sky-900 hover:bg-sky-300/45 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] transition-all dark:border-[rgba(55,113,200,0.35)] dark:bg-[rgba(55,113,200,0.25)] dark:text-blue-100 dark:hover:bg-[rgba(55,113,200,0.4)] dark:hover:shadow-[0_0_20px_rgba(55,113,200,0.5)]"
        >
          New Send
        </Link>
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white/40 backdrop-blur-sm p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <FinancialsFilters
          currentParams={currentParams}
          availableSubs={availableSubs}
        />

        <FinancialsSummary summary={summary} currency={currency} />

        <FinancialsList entries={entries} currency={currency} />
      </div>
    </>
  );
}
