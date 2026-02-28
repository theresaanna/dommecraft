"use client";

type PerSubEntry = {
  subId: string | null;
  subName: string;
  total: string | number;
  count: number;
};

type CategoryEntry = {
  category: string;
  total: string | number;
  count: number;
};

type SummaryData = {
  total: string | number;
  average: string | number;
  count: number;
  perSub: PerSubEntry[];
  byCategory: CategoryEntry[];
};

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0.00";
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function FinancialsSummary({
  summary,
}: {
  summary: SummaryData;
}) {
  const totalNum =
    typeof summary.total === "string"
      ? parseFloat(summary.total)
      : summary.total;
  const maxCategoryTotal = Math.max(
    ...summary.byCategory.map((c) =>
      typeof c.total === "string" ? parseFloat(c.total) : c.total
    ),
    1
  );

  return (
    <div className="mt-6 space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Total Earnings
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(summary.total)}
          </p>
        </div>
        <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Average per Entry
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(summary.average)}
          </p>
        </div>
        <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Entry Count
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {summary.count}
          </p>
        </div>
      </div>

      {summary.count === 0 && (
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          No financial data to display.
        </p>
      )}

      {/* Top earners */}
      {summary.perSub.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Top Earners
          </h3>
          <ul className="mt-2 space-y-1">
            {summary.perSub.slice(0, 5).map((entry, i) => (
              <li
                key={entry.subId || `unlinked-${i}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-zinc-700 dark:text-zinc-300">
                  {entry.subName}
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {formatCurrency(entry.total)}{" "}
                  <span className="text-xs text-zinc-400">
                    ({entry.count})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Category breakdown */}
      {summary.byCategory.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            By Category
          </h3>
          <div className="mt-2 space-y-2">
            {summary.byCategory.map((cat) => {
              const catTotal =
                typeof cat.total === "string"
                  ? parseFloat(cat.total)
                  : cat.total;
              const pct =
                totalNum > 0 ? Math.round((catTotal / totalNum) * 100) : 0;
              const barWidth = (catTotal / maxCategoryTotal) * 100;

              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {cat.category}
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(cat.total)} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-2 rounded-full bg-zinc-700 dark:bg-zinc-300"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
