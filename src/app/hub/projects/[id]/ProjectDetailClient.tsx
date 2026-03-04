"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NotesList from "./NotesList";
import NoteForm from "./NoteForm";
import ProjectTodoForm from "./ProjectTodoForm";
import ProjectTodoList from "./ProjectTodoList";
import ProjectForm from "../../ProjectForm";

type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  categoryId: string;
  category: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
};

type Note = {
  id: string;
  title: string | null;
  content: string;
  sortOrder: number;
  reminderAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProjectTodo = {
  id: string;
  title: string;
  completed: boolean;
  deadline: string | null;
  sortOrder: number;
  calendarEventId: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function ProjectDetailClient({
  project,
  initialNotes,
  initialTasks,
}: {
  project: Project;
  initialNotes: Note[];
  initialTasks: ProjectTodo[];
}) {
  const router = useRouter();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);

  async function handleDeleteProject() {
    if (
      !confirm(
        `Delete project "${project.name}"? This will also delete all notes. This cannot be undone.`
      )
    ) {
      return;
    }

    const res = await fetch(`/api/hub/projects/${project.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      router.push("/hub");
      router.refresh();
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/hub"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          &larr; Back to Hub
        </Link>
      </div>

      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {project.name}
            </h1>
            {project.description && (
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                {project.description}
              </p>
            )}
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Category: {project.category.name}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditForm(!showEditForm)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {showEditForm ? "Cancel" : "Edit Project"}
            </button>
            <button
              onClick={handleDeleteProject}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {showEditForm && (
        <div className="mb-6">
          <ProjectForm
            categoryId={project.categoryId}
            project={project}
            onClose={() => {
              setShowEditForm(false);
              router.refresh();
            }}
          />
        </div>
      )}

      {/* Todos Section */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Todos
        </h2>
        <button
          onClick={() => setShowTaskForm(!showTaskForm)}
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {showTaskForm ? "Cancel" : "New Todo"}
        </button>
      </div>

      {showTaskForm && (
        <div className="mb-4">
          <ProjectTodoForm
            projectId={project.id}
            onCreated={() => {
              setShowTaskForm(false);
              router.refresh();
            }}
          />
        </div>
      )}

      <ProjectTodoList tasks={initialTasks} />

      <div className="mt-10 mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Notes
        </h2>
        <button
          onClick={() => {
            setEditingNote(null);
            setShowNoteForm(!showNoteForm);
          }}
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {showNoteForm && !editingNote ? "Cancel" : "New Note"}
        </button>
      </div>

      {(showNoteForm || editingNote) && (
        <div className="mb-4">
          <NoteForm
            projectId={project.id}
            note={editingNote || undefined}
            onClose={() => {
              setShowNoteForm(false);
              setEditingNote(null);
              router.refresh();
            }}
          />
        </div>
      )}

      <NotesList
        notes={initialNotes}
        editingNoteId={editingNote?.id ?? null}
        onEdit={(note) => {
          setEditingNote(note);
          setShowNoteForm(false);
        }}
      />
    </div>
  );
}
