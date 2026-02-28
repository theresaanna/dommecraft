"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

const ARRANGEMENT_OPTIONS = [
  "Online",
  "IRL",
  "Hybrid",
  "Financial",
  "Service",
];

const SUB_TYPE_OPTIONS = [
  "Finsub",
  "Femsub",
  "Service Sub",
  "Pain Sub",
  "Pet",
  "Slave",
  "Sissy",
  "Brat",
  "Switch",
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Date Added" },
  { value: "updatedAt", label: "Last Updated" },
  { value: "fullName", label: "Name" },
  { value: "expendableIncome", label: "Financial" },
];

type FilterParams = {
  q: string;
  sub_type: string[];
  arrangement_type: string[];
  tags: string[];
  financial_min: string;
  financial_max: string;
  sort: string;
  order: string;
};

export default function SubsFilters({
  currentParams,
  availableTags,
}: {
  currentParams: FilterParams;
  availableTags: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [showFilters, setShowFilters] = useState(
    currentParams.sub_type.length > 0 ||
      currentParams.arrangement_type.length > 0 ||
      currentParams.tags.length > 0 ||
      currentParams.financial_min !== "" ||
      currentParams.financial_max !== ""
  );

  function applyFilters(updates: Partial<FilterParams>) {
    const merged = { ...currentParams, ...updates };
    const params = new URLSearchParams();

    if (merged.q) params.set("q", merged.q);
    merged.sub_type.forEach((v) => params.append("sub_type", v));
    merged.arrangement_type.forEach((v) =>
      params.append("arrangement_type", v)
    );
    merged.tags.forEach((v) => params.append("tags", v));
    if (merged.financial_min) params.set("financial_min", merged.financial_min);
    if (merged.financial_max) params.set("financial_max", merged.financial_max);
    if (merged.sort !== "createdAt") params.set("sort", merged.sort);
    if (merged.order !== "desc") params.set("order", merged.order);

    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleArrayValue(
    key: "sub_type" | "arrangement_type" | "tags",
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
      q: currentParams.q,
      sub_type: [],
      arrangement_type: [],
      tags: [],
      financial_min: "",
      financial_max: "",
      sort: "createdAt",
      order: "desc",
    });
  }

  const hasActiveFilters =
    currentParams.sub_type.length > 0 ||
    currentParams.arrangement_type.length > 0 ||
    currentParams.tags.length > 0 ||
    currentParams.financial_min !== "" ||
    currentParams.financial_max !== "";

  return (
    <div className="mt-6 space-y-3">
      {/* Search + Sort row */}
      <div className="flex gap-2">
        <form
          className="flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            applyFilters({ q: (form.get("q") as string) || "" });
          }}
        >
          <input
            type="search"
            name="q"
            placeholder="Search subs..."
            defaultValue={currentParams.q}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-400"
          />
        </form>

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
          Filters{hasActiveFilters ? ` (${currentParams.sub_type.length + currentParams.arrangement_type.length + currentParams.tags.length + (currentParams.financial_min ? 1 : 0) + (currentParams.financial_max ? 1 : 0)})` : ""}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="space-y-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          {/* Sub Type */}
          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Type of Submissive
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {SUB_TYPE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleArrayValue("sub_type", option)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    currentParams.sub_type.includes(option)
                      ? "bg-zinc-800 text-zinc-50 dark:bg-zinc-200 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Arrangement Type */}
          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Arrangement Type
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {ARRANGEMENT_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleArrayValue("arrangement_type", option)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    currentParams.arrangement_type.includes(option)
                      ? "bg-zinc-800 text-zinc-50 dark:bg-zinc-200 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Tags */}
          {availableTags.length > 0 && (
            <fieldset>
              <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Tags
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleArrayValue("tags", tag)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      currentParams.tags.includes(tag)
                        ? "bg-zinc-800 text-zinc-50 dark:bg-zinc-200 dark:text-zinc-900"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* Financial Range */}
          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Financial Contribution Range
            </legend>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                aria-label="Financial minimum"
                defaultValue={currentParams.financial_min}
                onBlur={(e) =>
                  applyFilters({ financial_min: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    applyFilters({
                      financial_min: (e.target as HTMLInputElement).value,
                    });
                  }
                }}
                className="w-28 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <span className="text-sm text-zinc-400">&ndash;</span>
              <input
                type="number"
                placeholder="Max"
                aria-label="Financial maximum"
                defaultValue={currentParams.financial_max}
                onBlur={(e) =>
                  applyFilters({ financial_max: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    applyFilters({
                      financial_max: (e.target as HTMLInputElement).value,
                    });
                  }
                }}
                className="w-28 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
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
