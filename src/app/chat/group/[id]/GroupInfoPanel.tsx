"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type GroupMemberInfo = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  role: "ADMIN" | "MEMBER";
  userRole: "DOMME" | "SUB";
};

type Props = {
  groupConversationId: string;
  groupName: string;
  members: GroupMemberInfo[];
  currentUserId: string;
  currentUserRole: "ADMIN" | "MEMBER";
  onClose: () => void;
  onGroupUpdate: (name: string) => void;
  onMembersChange: (members: GroupMemberInfo[]) => void;
};

type Contact = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function GroupInfoPanel({
  groupConversationId,
  groupName,
  members,
  currentUserId,
  currentUserRole,
  onClose,
  onGroupUpdate,
  onMembersChange,
}: Props) {
  const router = useRouter();
  const isAdmin = currentUserRole === "ADMIN";

  // Group name editing
  const [editName, setEditName] = useState(groupName);
  const [savingName, setSavingName] = useState(false);

  // Leave group
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  // Member actions
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [togglingRoleId, setTogglingRoleId] = useState<string | null>(null);

  // Add members
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set()
  );
  const [addingMembers, setAddingMembers] = useState(false);

  // Keep editName in sync if groupName prop changes
  useEffect(() => {
    setEditName(groupName);
  }, [groupName]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const res = await fetch("/api/chat/contacts");
      if (!res.ok) return;
      const data: Contact[] = await res.json();
      setContacts(data);
    } catch {
      // Silently fail
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  function handleToggleAddMembers() {
    const next = !showAddMembers;
    setShowAddMembers(next);
    if (next) {
      setSelectedUserIds(new Set());
      fetchContacts();
    }
  }

  async function handleSaveName() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === groupName) return;

    setSavingName(true);
    try {
      const res = await fetch(`/api/chat/group/${groupConversationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (res.ok) {
        onGroupUpdate(trimmed);
      }
    } catch {
      // Silently fail
    } finally {
      setSavingName(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    setRemovingId(userId);
    try {
      const res = await fetch(
        `/api/chat/group/${groupConversationId}/members/${userId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        onMembersChange(members.filter((m) => m.id !== userId));
      }
    } catch {
      // Silently fail
    } finally {
      setRemovingId(null);
    }
  }

  async function handleToggleRole(member: GroupMemberInfo) {
    const newRole = member.role === "ADMIN" ? "MEMBER" : "ADMIN";
    setTogglingRoleId(member.id);
    try {
      const res = await fetch(
        `/api/chat/group/${groupConversationId}/members/${member.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (res.ok) {
        onMembersChange(
          members.map((m) => (m.id === member.id ? { ...m, role: newRole } : m))
        );
      }
    } catch {
      // Silently fail
    } finally {
      setTogglingRoleId(null);
    }
  }

  async function handleLeaveGroup() {
    setLeaving(true);
    setLeaveError(null);
    try {
      const res = await fetch(
        `/api/chat/group/${groupConversationId}/members/${currentUserId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        router.push("/chat");
      } else {
        const data = await res.json().catch(() => null);
        setLeaveError(data?.error || "Failed to leave group");
      }
    } catch {
      setLeaveError("Failed to leave group");
    } finally {
      setLeaving(false);
    }
  }

  function handleContactToggle(contactId: string) {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  }

  async function handleAddSelected() {
    if (selectedUserIds.size === 0) return;

    setAddingMembers(true);
    try {
      const res = await fetch(
        `/api/chat/group/${groupConversationId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: Array.from(selectedUserIds) }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const added: GroupMemberInfo[] = data.added || [];
        onMembersChange([...members, ...added]);
        setSelectedUserIds(new Set());
        setShowAddMembers(false);
      }
    } catch {
      // Silently fail
    } finally {
      setAddingMembers(false);
    }
  }

  const memberIds = new Set(members.map((m) => m.id));
  const availableContacts = contacts.filter((c) => !memberIds.has(c.id));

  return (
    <div
      data-testid="group-info-panel"
      className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col border-l border-zinc-200 bg-white transition-transform duration-200 ease-in-out dark:border-zinc-800 dark:bg-zinc-950 md:w-72"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Group Info
        </h2>
        <button
          onClick={onClose}
          aria-label="Close group info"
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Group Name Section */}
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Group Name
          </label>
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <button
                onClick={handleSaveName}
                disabled={
                  savingName || !editName.trim() || editName.trim() === groupName
                }
                className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Save
              </button>
            </div>
          ) : (
            <p className="text-sm text-zinc-900 dark:text-zinc-50">
              {groupName}
            </p>
          )}
        </div>

        {/* Members Section */}
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h3 className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Members ({members.length})
          </h3>
          <ul className="space-y-2">
            {members.map((member) => {
              const isSelf = member.id === currentUserId;
              return (
                <li
                  key={member.id}
                  className="flex items-center gap-2"
                >
                  {/* Avatar */}
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                      {getInitials(member.name)}
                    </span>
                  )}

                  {/* Name + role badge */}
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-zinc-900 dark:text-zinc-50">
                      {member.name || "Unknown"}
                      {isSelf && (
                        <span className="ml-1 text-xs text-zinc-400 dark:text-zinc-500">
                          (you)
                        </span>
                      )}
                    </span>
                    {member.role === "ADMIN" && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Admin
                      </span>
                    )}
                  </div>

                  {/* Admin actions for non-self members */}
                  {isAdmin && !isSelf && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => handleToggleRole(member)}
                        disabled={togglingRoleId === member.id}
                        className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                      >
                        {member.role === "ADMIN"
                          ? "Remove Admin"
                          : "Make Admin"}
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingId === member.id}
                        className="rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Add Members (ADMIN only) */}
        {isAdmin && (
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <button
              onClick={handleToggleAddMembers}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {showAddMembers ? "Cancel" : "Add Members"}
            </button>

            {showAddMembers && (
              <div className="mt-3">
                {loadingContacts && (
                  <p className="py-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    Loading contacts...
                  </p>
                )}

                {!loadingContacts && availableContacts.length === 0 && (
                  <p className="py-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    No contacts available to add.
                  </p>
                )}

                {!loadingContacts && availableContacts.length > 0 && (
                  <>
                    <ul className="max-h-48 space-y-1 overflow-y-auto">
                      {availableContacts.map((contact) => (
                        <li key={contact.id}>
                          <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                            <input
                              type="checkbox"
                              checked={selectedUserIds.has(contact.id)}
                              onChange={() => handleContactToggle(contact.id)}
                              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800"
                            />
                            {contact.avatarUrl ? (
                              <img
                                src={contact.avatarUrl}
                                alt=""
                                className="h-6 w-6 rounded-full object-cover"
                              />
                            ) : (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                                {getInitials(contact.name)}
                              </span>
                            )}
                            <span className="truncate text-sm text-zinc-900 dark:text-zinc-50">
                              {contact.name || "Unknown"}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={handleAddSelected}
                      disabled={selectedUserIds.size === 0 || addingMembers}
                      className="mt-2 w-full rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      Add Selected ({selectedUserIds.size})
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leave Group (footer) */}
      <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
        {leaveError && (
          <p className="mb-2 text-center text-xs text-red-500 dark:text-red-400">
            {leaveError}
          </p>
        )}
        <button
          onClick={handleLeaveGroup}
          disabled={leaving}
          className="w-full rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        >
          {leaving ? "Leaving..." : "Leave Group"}
        </button>
      </div>
    </div>
  );
}
