"use client";

import Link from "next/link";

type ProjectTask = {
  id: string;
  title: string;
  completed: boolean;
  deadline: string | null;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  category: { id: string; name: string };
  notesCount: number;
  tasks: ProjectTask[];
  createdAt: string;
  updatedAt: string;
};

export default function ProjectList({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 p-8 text-center dark:border-zinc-800">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No projects yet. Create your first project to get started.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {projects.map((project) => {
        const completedCount = project.tasks.filter((t) => t.completed).length;
        const totalCount = project.tasks.length;

        return (
          <li key={project.id}>
            <Link
              href={`/hub/projects/${project.id}`}
              className="block px-4 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
            >
              <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                {project.name}
              </h3>
              {project.description && (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {project.description}
                </p>
              )}
              {project.tasks.length > 0 && (
                <div className="mt-2">
                  <div className="mb-1.5 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>
                      {completedCount}/{totalCount} tasks
                    </span>
                    <div className="h-1.5 w-20 rounded-full bg-zinc-200 dark:bg-zinc-700">
                      <div
                        className="h-1.5 rounded-full bg-zinc-600 dark:bg-zinc-400"
                        style={{
                          width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <ul className="space-y-0.5">
                    {project.tasks.map((task) => (
                      <li
                        key={task.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                            task.completed
                              ? "border-zinc-400 bg-zinc-400 dark:border-zinc-500 dark:bg-zinc-500"
                              : "border-zinc-300 dark:border-zinc-600"
                          }`}
                        >
                          {task.completed && (
                            <svg
                              viewBox="0 0 12 12"
                              fill="none"
                              className="h-2.5 w-2.5 text-white dark:text-zinc-900"
                            >
                              <path
                                d="M2.5 6L5 8.5L9.5 3.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        <span
                          className={
                            task.completed
                              ? "text-zinc-400 line-through dark:text-zinc-500"
                              : "text-zinc-700 dark:text-zinc-300"
                          }
                        >
                          {task.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  {project.notesCount}{" "}
                  {project.notesCount === 1 ? "note" : "notes"}
                </span>
                <span>&middot;</span>
                <span>
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
