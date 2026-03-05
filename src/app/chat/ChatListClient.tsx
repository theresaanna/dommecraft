"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePresence } from "@/hooks/use-presence";

type DMConversation = {
  id: string;
  type: "dm";
  other: { id: string; name: string | null; avatarUrl: string | null };
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  updatedAt: string;
};

type GroupConversation = {
  id: string;
  type: "group";
  name: string;
  memberCount: number;
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
    senderName?: string | null;
  } | null;
  updatedAt: string;
};

type ConversationItem = DMConversation | GroupConversation;

type Contact = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ChatListClient({
  conversations,
}: {
  conversations: ConversationItem[];
}) {
  const router = useRouter();
  const { isOnline } = usePresence();
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  // Group creation state
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupContacts, setGroupContacts] = useState<Contact[]>([]);
  const [loadingGroupContacts, setLoadingGroupContacts] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<Set<string>>(
    new Set()
  );
  const [groupName, setGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  async function handleNewChat() {
    if (showContacts) {
      setShowContacts(false);
      return;
    }
    setShowGroupForm(false);

    setLoadingContacts(true);
    try {
      const res = await fetch("/api/chat/contacts");
      if (!res.ok) return;
      const data: Contact[] = await res.json();

      const existingIds = new Set(
        conversations
          .filter((c): c is DMConversation => c.type === "dm")
          .map((c) => c.other.id)
      );
      setContacts(data.filter((c) => !existingIds.has(c.id)));
      setShowContacts(true);
    } finally {
      setLoadingContacts(false);
    }
  }

  async function handleNewGroup() {
    if (showGroupForm) {
      setShowGroupForm(false);
      return;
    }
    setShowContacts(false);

    setLoadingGroupContacts(true);
    try {
      const res = await fetch("/api/chat/contacts");
      if (!res.ok) return;
      const data: Contact[] = await res.json();
      setGroupContacts(data);
      setSelectedGroupMembers(new Set());
      setGroupName("");
      setShowGroupForm(true);
    } finally {
      setLoadingGroupContacts(false);
    }
  }

  async function startConversation(recipientId: string) {
    setStarting(recipientId);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId }),
      });
      if (!res.ok) return;
      const data = await res.json();
      router.push(`/chat/${data.id}`);
    } finally {
      setStarting(null);
    }
  }

  function toggleGroupMember(id: string) {
    setSelectedGroupMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function createGroup() {
    if (!groupName.trim() || selectedGroupMembers.size === 0 || creatingGroup)
      return;

    setCreatingGroup(true);
    try {
      const res = await fetch("/api/chat/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          memberIds: Array.from(selectedGroupMembers),
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      router.push(`/chat/group/${data.id}`);
    } finally {
      setCreatingGroup(false);
    }
  }

  return (
    <>
      <div className="mt-6 flex gap-2">
        <button
          onClick={handleNewChat}
          disabled={loadingContacts}
          className="flex-1 rounded-lg border border-zinc-200 px-4 py-3 text-center text-base font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900/50"
        >
          {loadingContacts
            ? "Loading..."
            : showContacts
              ? "Cancel"
              : "New Chat"}
        </button>
        <button
          onClick={handleNewGroup}
          disabled={loadingGroupContacts}
          className="flex-1 rounded-lg border border-zinc-200 px-4 py-3 text-center text-base font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900/50"
        >
          {loadingGroupContacts
            ? "Loading..."
            : showGroupForm
              ? "Cancel"
              : "New Group"}
        </button>
      </div>

      {/* New Chat contacts */}
      {showContacts && (
        <div className="mt-4">
          {contacts.length === 0 ? (
            <p className="text-center text-base text-zinc-500 dark:text-zinc-400">
              No new contacts available.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white/40 backdrop-blur-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/60">
              {contacts.map((contact) => (
                <li key={contact.id}>
                  <button
                    onClick={() => startConversation(contact.id)}
                    disabled={starting === contact.id}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 disabled:opacity-50 dark:hover:bg-zinc-900/50"
                  >
                    {contact.avatarUrl ? (
                      <img
                        src={contact.avatarUrl}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                        {getInitials(contact.name)}
                      </span>
                    )}
                    <span className="text-base font-medium text-zinc-900 dark:text-zinc-50">
                      {contact.name || "Unknown"}
                    </span>
                    {starting === contact.id && (
                      <span className="ml-auto text-sm text-zinc-500">
                        Starting...
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* New Group form */}
      {showGroupForm && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-white/40 backdrop-blur-sm p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <input
            type="text"
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="mb-3 w-full rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
            Select members:
          </p>
          {groupContacts.length === 0 ? (
            <p className="text-center text-base text-zinc-500 dark:text-zinc-400">
              No contacts available.
            </p>
          ) : (
            <ul className="mb-3 max-h-48 divide-y divide-zinc-200 overflow-y-auto dark:divide-zinc-800">
              {groupContacts.map((contact) => (
                <li key={contact.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <input
                      type="checkbox"
                      checked={selectedGroupMembers.has(contact.id)}
                      onChange={() => toggleGroupMember(contact.id)}
                      className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
                    />
                    {contact.avatarUrl ? (
                      <img
                        src={contact.avatarUrl}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                        {getInitials(contact.name)}
                      </span>
                    )}
                    <span className="text-base text-zinc-900 dark:text-zinc-50">
                      {contact.name || "Unknown"}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={createGroup}
            disabled={
              creatingGroup ||
              !groupName.trim() ||
              selectedGroupMembers.size === 0
            }
            className="w-full rounded-md bg-sky-300/30 backdrop-blur-sm border border-sky-400/30 px-4 py-2 text-base font-medium text-sky-900 transition-all hover:bg-sky-300/45 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] disabled:opacity-50 dark:border-[rgba(55,113,200,0.35)] dark:bg-[rgba(55,113,200,0.25)] dark:text-blue-100 dark:hover:bg-[rgba(55,113,200,0.4)] dark:hover:shadow-[0_0_20px_rgba(55,113,200,0.5)]"
          >
            {creatingGroup ? "Creating..." : "Create Group"}
          </button>
        </div>
      )}

      {/* Conversation list */}
      {conversations.length === 0 && !showContacts && !showGroupForm ? (
        <p className="mt-8 text-center text-base text-zinc-500 dark:text-zinc-400">
          No conversations yet.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-200 dark:divide-zinc-800">
          {conversations.map((conv) => {
            if (conv.type === "dm") {
              return (
                <li key={conv.id}>
                  <Link
                    href={`/chat/${conv.id}`}
                    className="flex items-center gap-3 px-2 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <div className="relative">
                      {conv.other.avatarUrl ? (
                        <img
                          src={conv.other.avatarUrl}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-base font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                          {getInitials(conv.other.name)}
                        </span>
                      )}
                      <span
                        data-testid={`presence-${conv.other.id}`}
                        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-950 ${
                          isOnline(conv.other.id)
                            ? "bg-green-500"
                            : "bg-zinc-300 dark:bg-zinc-600"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-base font-medium text-zinc-900 dark:text-zinc-50">
                          {conv.other.name || "Unknown"}
                        </span>
                        {conv.lastMessage && (
                          <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                            {formatTime(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="truncate text-base text-zinc-500 dark:text-zinc-400">
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            }

            // Group conversation
            return (
              <li key={conv.id}>
                <Link
                  href={`/chat/group/${conv.id}`}
                  className="flex items-center gap-3 px-2 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-base font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {getInitials(conv.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-base font-medium text-zinc-900 dark:text-zinc-50">
                        {conv.name}
                      </span>
                      {conv.lastMessage && (
                        <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                          {formatTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-zinc-400 dark:text-zinc-500">
                        {conv.memberCount} members
                      </span>
                      {conv.lastMessage && (
                        <>
                          <span className="text-sm text-zinc-300 dark:text-zinc-600">
                            &middot;
                          </span>
                          <p className="truncate text-base text-zinc-500 dark:text-zinc-400">
                            {conv.lastMessage.senderName
                              ? `${conv.lastMessage.senderName}: `
                              : ""}
                            {conv.lastMessage.content}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
