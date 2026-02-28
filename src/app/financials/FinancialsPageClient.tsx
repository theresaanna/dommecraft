"use client";

import { useState } from "react";
import FinancialsFilters from "./FinancialsFilters";
import FinancialsSummary from "./FinancialsSummary";
import FinancialsList from "./FinancialsList";
import FinancialEntryForm from "./FinancialEntryForm";

type AvailableSub = {
  id: string;
  fullName: string;
};

type FinancialEntry = {
  id: string;
  amount: string;
  currency: string;
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
}: {
  entries: FinancialEntry[];
  summary: SummaryData;
  availableSubs: AvailableSub[];
  currentParams: FilterParams;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Financial Tracking
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {showForm ? "Cancel" : "Add Entry"}
        </button>
      </div>

      {showForm && (
        <div className="mt-4">
          <FinancialEntryForm
            subs={availableSubs}
            onClose={() => setShowForm(false)}
          />
        </div>
      )}

      <FinancialsFilters
        currentParams={currentParams}
        availableSubs={availableSubs}
      />

      <FinancialsSummary summary={summary} />

      <FinancialsList entries={entries} />
    </>
  );
}
