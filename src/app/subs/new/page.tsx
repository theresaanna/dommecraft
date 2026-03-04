"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import TagInput from "@/components/TagInput";
import { useTagSuggestions } from "@/hooks/use-tag-suggestions";

const ARRANGEMENT_OPTIONS = [
  "Online",
  "IRL",
  "Hybrid",
  "Financial",
  "Service",
];

const SUB_TYPE_OPTIONS = [
  "Finsub",
  "Femsub",
  "Service Sub",
  "Pain Sub",
  "Pet",
  "Slave",
  "Sissy",
  "Brat",
  "Switch",
];

export default function NewSubPage() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const tagSuggestions = useTagSuggestions();
  const [tags, setTags] = useState<string[]>([]);
  const [softLimits, setSoftLimits] = useState<string[]>([]);
  const [hardLimits, setHardLimits] = useState<string[]>([]);

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (status === "authenticated" && session?.user?.role !== "DOMME") {
    router.push("/dashboard");
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);

    const body = {
      fullName: form.get("fullName"),
      contactInfo: form.get("contactInfo") || null,
      arrangementType: form.getAll("arrangementType"),
      subType: form.getAll("subType"),
      timezone: form.get("timezone") || null,
      softLimits,
      hardLimits,
      tags,
      privateNotes: form.get("privateNotes") || null,
    };

    try {
      const res = await fetch("/api/subs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      const sub = await res.json();
      router.push(`/subs/${sub.id}`);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="mb-4">
        <Link
          href="/subs"
          className="text-base text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          &larr; All Subs
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
        Add Sub
      </h1>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-base text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Full Name */}
        <div>
          <label
            htmlFor="fullName"
            className="block text-base font-medium text-zinc-700 dark:text-zinc-300"
          >
            Full Name *
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        {/* Contact Info */}
        <div>
          <label
            htmlFor="contactInfo"
            className="block text-base font-medium text-zinc-700 dark:text-zinc-300"
          >
            Contact Info
          </label>
          <input
            id="contactInfo"
            name="contactInfo"
            type="text"
            placeholder="Phone, email, platform handle..."
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        {/* Arrangement Type */}
        <fieldset>
          <legend className="text-base font-medium text-zinc-700 dark:text-zinc-300">
            Arrangement Type
          </legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {ARRANGEMENT_OPTIONS.map((option) => (
              <label key={option} className="flex items-center gap-1.5 text-base text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  name="arrangementType"
                  value={option}
                  className="rounded border-zinc-300 dark:border-zinc-600"
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Sub Type */}
        <fieldset>
          <legend className="text-base font-medium text-zinc-700 dark:text-zinc-300">
            Type of Submissive
          </legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {SUB_TYPE_OPTIONS.map((option) => (
              <label key={option} className="flex items-center gap-1.5 text-base text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  name="subType"
                  value={option}
                  className="rounded border-zinc-300 dark:border-zinc-600"
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Timezone */}
        <div>
          <label
            htmlFor="timezone"
            className="block text-base font-medium text-zinc-700 dark:text-zinc-300"
          >
            Timezone
          </label>
          <select
            id="timezone"
            name="timezone"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Select timezone...</option>
            {Intl.supportedValuesOf("timeZone").map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        {/* Soft Limits */}
        <TagInput
          label="Soft Limits"
          name="softLimits"
          placeholder="Type and press Enter or comma to add..."
          suggestions={tagSuggestions}
          value={softLimits}
          onChange={setSoftLimits}
        />

        {/* Hard Limits */}
        <TagInput
          label="Hard Limits"
          name="hardLimits"
          placeholder="Type and press Enter or comma to add..."
          suggestions={tagSuggestions}
          value={hardLimits}
          onChange={setHardLimits}
        />

        {/* Tags */}
        <TagInput
          label="Tags"
          name="tags"
          placeholder="Type and press Enter or comma to add..."
          suggestions={tagSuggestions}
          value={tags}
          onChange={setTags}
        />

        {/* Private Notes */}
        <div>
          <label
            htmlFor="privateNotes"
            className="block text-base font-medium text-zinc-700 dark:text-zinc-300"
          >
            Private Notes
          </label>
          <textarea
            id="privateNotes"
            name="privateNotes"
            rows={3}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-zinc-800 px-4 py-2 text-base font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {loading ? "Creating..." : "Create Sub"}
        </button>
      </form>
    </div>
  );
}
