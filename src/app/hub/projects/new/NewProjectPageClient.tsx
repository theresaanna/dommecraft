"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import ProjectForm from "../../ProjectForm";

type Category = {
  id: string;
  name: string;
};

export default function NewProjectPageClient({
  categories,
  defaultCategoryId,
}: {
  categories: Category[];
  defaultCategoryId: string | null;
}) {
  const router = useRouter();

  return (
    <>
      <div className="mb-4">
        <Link
          href="/hub"
          className="text-base text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          &larr; Back to Hub
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
        New Project
      </h1>
      <div className="mt-6">
        <ProjectForm
          categories={categories}
          defaultCategoryId={defaultCategoryId}
          onClose={() => router.push("/hub")}
        />
      </div>
    </>
  );
}
