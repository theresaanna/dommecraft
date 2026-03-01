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
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          &larr; All Tasks
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        New Task
      </h1>
      <div className="mt-6">
        <TaskForm
          availableSubs={availableSubs}
          availableProjects={availableProjects}
          onClose={() => router.push("/tasks")}
        />
      </div>
    </>
  );
}
