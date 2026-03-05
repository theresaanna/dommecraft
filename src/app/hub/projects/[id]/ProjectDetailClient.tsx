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
          className="text-base text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          &larr; Back to Hub
        </Link>
      </div>

      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {project.name}
            </h1>
            {project.description && (
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                {project.description}
              </p>
            )}
            <p className="mt-2 text-base text-zinc-500 dark:text-zinc-400">
              Category: {project.category.name}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditForm(!showEditForm)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-base font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {showEditForm ? "Cancel" : "Edit Project"}
            </button>
            <button
              onClick={handleDeleteProject}
              className="rounded-md border border-red-300 px-3 py-1.5 text-base font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {showEditForm && (
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white/40 backdrop-blur-sm p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
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
      <div className="rounded-lg border border-zinc-200 bg-white/40 backdrop-blur-sm p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Todos
          </h2>
          <button
            onClick={() => setShowTaskForm(!showTaskForm)}
            className="rounded-md bg-sky-300/30 backdrop-blur-sm border border-sky-400/30 px-4 py-2 text-base font-medium text-sky-900 hover:bg-sky-300/45 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] transition-all dark:border-[rgba(55,113,200,0.35)] dark:bg-[rgba(55,113,200,0.25)] dark:text-blue-100 dark:hover:bg-[rgba(55,113,200,0.4)] dark:hover:shadow-[0_0_20px_rgba(55,113,200,0.5)]"
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
      </div>

      {/* Notes Section */}
      <div className="mt-6 rounded-lg border border-zinc-200 bg-white/40 backdrop-blur-sm p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Notes
          </h2>
          <button
            onClick={() => {
              setEditingNote(null);
              setShowNoteForm(!showNoteForm);
            }}
            className="rounded-md bg-sky-300/30 backdrop-blur-sm border border-sky-400/30 px-4 py-2 text-base font-medium text-sky-900 hover:bg-sky-300/45 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] transition-all dark:border-[rgba(55,113,200,0.35)] dark:bg-[rgba(55,113,200,0.25)] dark:text-blue-100 dark:hover:bg-[rgba(55,113,200,0.4)] dark:hover:shadow-[0_0_20px_rgba(55,113,200,0.5)]"
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
    </div>
  );
}
