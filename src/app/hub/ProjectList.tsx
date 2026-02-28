"use client";

import Link from "next/link";

type Project = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  category: { id: string; name: string };
  notesCount: number;
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
      {projects.map((project) => (
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
      ))}
    </ul>
  );
}
