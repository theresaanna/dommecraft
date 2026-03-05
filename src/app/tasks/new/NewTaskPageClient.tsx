"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import TaskForm from "../TaskForm";

type AvailableSub = {
  id: string;
  fullName: string;
};

type AvailableProject = {
  id: string;
  name: string;
};

export default function NewTaskPageClient({
  availableSubs,
  availableProjects,
}: {
  availableSubs: AvailableSub[];
  availableProjects: AvailableProject[];
}) {
  const router = useRouter();

  return (
    <>
      <div className="mb-4">
        <Link
          href="/tasks"
          className="text-base text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          &larr; All Tasks
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
        New Sub Task
      </h1>
      <div className="mt-6 rounded-lg border border-zinc-200 bg-white/40 backdrop-blur-sm p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <TaskForm
          availableSubs={availableSubs}
          availableProjects={availableProjects}
          onClose={() => router.push("/tasks")}
        />
      </div>
    </>
  );
}
