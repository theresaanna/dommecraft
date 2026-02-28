"use client";

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  projectCount: number;
  createdAt: string;
};

export default function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Categories
        </h3>
      </div>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {categories.map((category) => (
          <li key={category.id}>
            <button
              onClick={() => onSelectCategory(category.id)}
              className={`w-full px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/50 ${
                selectedCategoryId === category.id
                  ? "bg-zinc-100 dark:bg-zinc-900"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {category.name}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {category.projectCount}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
