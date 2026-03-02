"use client";

import { useState, useRef } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

type SettingsData = {
  name: string;
  email: string;
  avatarUrl: string | null;
  theme: "LIGHT" | "DARK" | "SYSTEM";
  calendarDefaultView: "MONTH" | "WEEK" | "DAY";
  slug: string;
};

export default function SettingsClient({
  initialSettings,
  userRole,
}: {
  initialSettings: SettingsData;
  userRole: "DOMME" | "SUB";
}) {
  const [settings, setSettings] = useState<SettingsData>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Failed to save settings");
        return;
      }
      document.cookie = `theme=${settings.theme};path=/;max-age=${60 * 60 * 24 * 365}`;
      setMessage("Settings saved");
    } catch {
      setMessage("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "avatars");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Upload failed");
        return;
      }

      const { url } = await res.json();
      setSettings((prev) => ({ ...prev, avatarUrl: url }));
    } catch {
      setMessage("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveAvatar() {
    setSettings((prev) => ({ ...prev, avatarUrl: null }));
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/user/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Failed to delete account");
        setDeleting(false);
        setShowDeleteConfirm(false);
        return;
      }
      await signOut({ callbackUrl: "/login" });
    } catch {
      setMessage("Failed to delete account. Please try again.");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <>
      <Link
        href="/dashboard"
        className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
      >
        &larr; Dashboard
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Settings
      </h1>

      {message && (
        <p className="mt-4 rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {message}
        </p>
      )}

      {/* Avatar Section */}
      <div className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Avatar
        </h2>
        <div className="mt-3 flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            {settings.avatarUrl ? (
              <img
                src={settings.avatarUrl}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-medium text-zinc-500 dark:text-zinc-400">
                {settings.name?.[0]?.toUpperCase() ||
                  settings.email?.[0]?.toUpperCase() ||
                  "?"}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
            {settings.avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
            data-testid="avatar-file-input"
          />
        </div>
      </div>

      {/* Profile Section */}
      <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Profile
        </h2>
        <div className="mt-3 space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Display Name
            </label>
            <input
              id="name"
              type="text"
              value={settings.name}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, name: e.target.value }))
              }
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={settings.email}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, email: e.target.value }))
              }
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
        </div>
      </div>

      {/* Profile URL Section */}
      <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Profile URL
        </h2>
        <div className="mt-3 space-y-3">
          <div>
            <label
              htmlFor="slug"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Custom URL
            </label>
            <div className="mt-1 flex items-center gap-0">
              <span className="rounded-l-md border border-r-0 border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                /u/
              </span>
              <input
                id="slug"
                type="text"
                value={settings.slug}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  }))
                }
                placeholder="your-custom-url"
                className="w-full rounded-r-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              3-30 characters. Lowercase letters, numbers, and hyphens only.
            </p>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Appearance
        </h2>
        <div className="mt-3">
          <label
            htmlFor="theme"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            Theme
          </label>
          <select
            id="theme"
            value={settings.theme}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                theme: e.target.value as SettingsData["theme"],
              }))
            }
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="SYSTEM">System</option>
            <option value="LIGHT">Light</option>
            <option value="DARK">Dark</option>
          </select>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Calendar
        </h2>
        <div className="mt-3">
          <label
            htmlFor="calendarDefaultView"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            Default View
          </label>
          <select
            id="calendarDefaultView"
            value={settings.calendarDefaultView}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                calendarDefaultView:
                  e.target.value as SettingsData["calendarDefaultView"],
              }))
            }
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="MONTH">Month</option>
            <option value="WEEK">Week</option>
            <option value="DAY">Day</option>
          </select>
        </div>
        <div className="mt-3">
          <Link
            href="/settings/calendar"
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            External calendar sync settings &rarr;
          </Link>
        </div>
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-6 rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>

      {/* Sign Out */}
      <div className="mt-12 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-md bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Sign out
        </button>
      </div>

      {/* Delete Account (dommes only) */}
      {userRole === "DOMME" && (
        <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Delete Account
            </button>
          ) : (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Are you sure you want to delete your account?
              </p>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                This action cannot be reversed. Your subs will keep their task
                history but will no longer be associated with you.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="rounded-md bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Yes, Delete My Account"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
