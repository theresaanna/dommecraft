"use client";

import { useRouter } from "next/navigation";

type Note = {
  id: string;
  title: string | null;
  content: string;
  sortOrder: number;
  reminderAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function NotesList({
  notes,
  onEdit,
}: {
  notes: Note[];
  onEdit: (note: Note) => void;
}) {
  const router = useRouter();

  async function handleDelete(noteId: string) {
    if (!confirm("Delete this note? This cannot be undone.")) {
      return;
    }

    const res = await fetch(`/api/hub/notes/${noteId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      router.refresh();
    }
  }

  if (notes.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 p-8 text-center dark:border-zinc-800">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No notes yet. Create your first note to get started.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {notes.map((note) => (
        <li
          key={note.id}
          className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              {note.title && (
                <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                  {note.title}
                </h3>
              )}
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {note.content}
              </p>
              <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  Updated {new Date(note.updatedAt).toLocaleDateString()}
                </span>
                {note.reminderAt && (
                  <>
                    <span>&middot;</span>
                    <span>
                      Reminder:{" "}
                      {new Date(note.reminderAt).toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="ml-4 flex shrink-0 gap-2">
              <button
                onClick={() => onEdit(note)}
                className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(note.id)}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Delete
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
