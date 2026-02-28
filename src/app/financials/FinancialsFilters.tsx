"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

const CATEGORY_OPTIONS = [
  "Tribute",
  "Gift",
  "Session",
  "Tip",
  "Task Payment",
  "Custom",
];

const PAYMENT_METHOD_OPTIONS = [
  "CashApp",
  "Venmo",
  "PayPal",
  "Crypto",
  "Bank Transfer",
  "Custom",
];

const TIME_RANGE_OPTIONS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const SORT_OPTIONS = [
  { value: "date", label: "Date" },
  { value: "amount", label: "Amount" },
  { value: "createdAt", label: "Date Added" },
];

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

type AvailableSub = {
  id: string;
  fullName: string;
};

export default function FinancialsFilters({
  currentParams,
  availableSubs,
}: {
  currentParams: FilterParams;
  availableSubs: AvailableSub[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [showFilters, setShowFilters] = useState(
    currentParams.category.length > 0 ||
      currentParams.payment_method.length > 0 ||
      currentParams.sub_id !== "" ||
      currentParams.is_in_app !== "" ||
      currentParams.date_from !== "" ||
      currentParams.date_to !== ""
  );

  function applyFilters(updates: Partial<FilterParams>) {
    const merged = { ...currentParams, ...updates };
    const params = new URLSearchParams();

    if (merged.time_range) params.set("time_range", merged.time_range);
    if (merged.date_from) params.set("date_from", merged.date_from);
    if (merged.date_to) params.set("date_to", merged.date_to);
    if (merged.sub_id) params.set("sub_id", merged.sub_id);
    merged.category.forEach((v) => params.append("category", v));
    merged.payment_method.forEach((v) => params.append("payment_method", v));
    if (merged.is_in_app) params.set("is_in_app", merged.is_in_app);
    if (merged.sort !== "date") params.set("sort", merged.sort);
    if (merged.order !== "desc") params.set("order", merged.order);

    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleArrayValue(
    key: "category" | "payment_method",
    value: string
  ) {
    const current = currentParams[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    applyFilters({ [key]: next });
  }

  function clearFilters() {
    applyFilters({
      time_range: "",
      date_from: "",
      date_to: "",
      sub_id: "",
      category: [],
      payment_method: [],
      is_in_app: "",
      sort: "date",
      order: "desc",
    });
  }

  const hasActiveFilters =
    currentParams.category.length > 0 ||
    currentParams.payment_method.length > 0 ||
    currentParams.sub_id !== "" ||
    currentParams.is_in_app !== "" ||
    currentParams.time_range !== "" ||
    currentParams.date_from !== "" ||
    currentParams.date_to !== "";

  const filterCount =
    currentParams.category.length +
    currentParams.payment_method.length +
    (currentParams.sub_id ? 1 : 0) +
    (currentParams.is_in_app ? 1 : 0) +
    (currentParams.time_range ? 1 : 0) +
    (currentParams.date_from ? 1 : 0) +
    (currentParams.date_to ? 1 : 0);

  return (
    <div className="mt-6 space-y-3">
      {/* Sort row */}
      <div className="flex gap-2">
        <select
          value={currentParams.sort}
          onChange={(e) => applyFilters({ sort: e.target.value })}
          aria-label="Sort by"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() =>
            applyFilters({
              order: currentParams.order === "asc" ? "desc" : "asc",
            })
          }
          aria-label={`Sort ${currentParams.order === "asc" ? "descending" : "ascending"}`}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {currentParams.order === "asc" ? "\u2191" : "\u2193"}
        </button>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          aria-label="Toggle filters"
          aria-expanded={showFilters}
          className={`rounded-md border px-3 py-2 text-sm font-medium ${
            hasActiveFilters
              ? "border-zinc-800 bg-zinc-800 text-zinc-50 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900"
              : "border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          Filters{hasActiveFilters ? ` (${filterCount})` : ""}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="space-y-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          {/* Time Range */}
          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Time Range
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {TIME_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    applyFilters({
                      time_range:
                        currentParams.time_range === opt.value
                          ? ""
                          : opt.value,
                      date_from: "",
                      date_to: "",
                    })
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    currentParams.time_range === opt.value
                      ? "bg-zinc-800 text-zinc-50 dark:bg-zinc-200 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="date"
                aria-label="Date from"
                value={currentParams.date_from}
                onChange={(e) =>
                  applyFilters({
                    date_from: e.target.value,
                    time_range: "",
                  })
                }
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <span className="text-sm text-zinc-400">&ndash;</span>
              <input
                type="date"
                aria-label="Date to"
                value={currentParams.date_to}
                onChange={(e) =>
                  applyFilters({
                    date_to: e.target.value,
                    time_range: "",
                  })
                }
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
          </fieldset>

          {/* Sub */}
          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Sub
            </legend>
            <select
              value={currentParams.sub_id}
              onChange={(e) => applyFilters({ sub_id: e.target.value })}
              aria-label="Filter by sub"
              className="mt-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">All</option>
              <option value="unlinked">Unlinked</option>
              {availableSubs.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.fullName}
                </option>
              ))}
            </select>
          </fieldset>

          {/* Category */}
          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Category
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleArrayValue("category", option)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    currentParams.category.includes(option)
                      ? "bg-zinc-800 text-zinc-50 dark:bg-zinc-200 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Payment Method */}
          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Payment Method
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleArrayValue("payment_method", option)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    currentParams.payment_method.includes(option)
                      ? "bg-zinc-800 text-zinc-50 dark:bg-zinc-200 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>

          {/* In-app toggle */}
          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Source
            </legend>
            <div className="mt-2 flex gap-2">
              {[
                { value: "", label: "All" },
                { value: "true", label: "In-app" },
                { value: "false", label: "Out-of-app" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => applyFilters({ is_in_app: opt.value })}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    currentParams.is_in_app === opt.value
                      ? "bg-zinc-800 text-zinc-50 dark:bg-zinc-200 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
