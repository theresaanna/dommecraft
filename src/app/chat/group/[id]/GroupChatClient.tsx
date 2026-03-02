"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import type Ably from "ably";
import { useAbly } from "@/components/providers/ably-provider";
import { usePresence } from "@/hooks/use-presence";
import { useGroupTyping } from "@/hooks/use-typing";
import EmojiPicker from "@/components/EmojiPicker";
import GroupInfoPanel from "./GroupInfoPanel";

type Reaction = {
  emoji: string;
  userId: string;
};

type ReplyTo = {
  id: string;
  content: string;
  senderName: string | null;
};

type Message = {
  id: string;
  senderId: string;
  content: string;
  senderName: string | null;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
  mediaFileSize?: number | null;
  editedAt?: string | null;
  createdAt: string;
  reactions: Reaction[];
  replyTo?: ReplyTo | null;
};

type GroupMessage = Message & { senderName: string | null };

type GroupMemberInfo = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  role: "ADMIN" | "MEMBER";
};

type ReactionEvent = {
  messageId: string;
  emoji: string;
  userId: string;
  action: "add" | "remove";
};

type ReadEvent = {
  userId: string;
  readAt: string;
};

type Props = {
  groupConversationId: string;
  currentUserId: string;
  currentUserName: string;
  groupName: string;
  members: GroupMemberInfo[];
  initialMessages: GroupMessage[];
  memberReadReceipts: Record<string, string | null>; // userId -> lastReadAt ISO
  showReadReceipts: boolean;
  currentUserRole: "ADMIN" | "MEMBER";
};

const EMOJI_OPTIONS = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F525}"];

function groupReactions(reactions: Reaction[]) {
  const map = new Map<string, string[]>();
  for (const r of reactions) {
    const users = map.get(r.emoji) || [];
    users.push(r.userId);
    map.set(r.emoji, users);
  }
  return map;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

export default function GroupChatClient({
  groupConversationId,
  currentUserId,
  currentUserName,
  groupName,
  members: initialMembers,
  initialMessages,
  memberReadReceipts: initialReadReceipts,
  showReadReceipts,
  currentUserRole: initialRole,
}: Props) {
  const [messages, setMessages] = useState<GroupMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);
  const [fullPickerOpenFor, setFullPickerOpenFor] = useState<string | null>(null);
  const [memberReadReceipts, setMemberReadReceipts] = useState<
    Record<string, string | null>
  >(initialReadReceipts);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState("");
  const [replyingToMessage, setReplyingToMessage] = useState<GroupMessage | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [members, setMembers] = useState<GroupMemberInfo[]>(initialMembers);
  const [localGroupName, setLocalGroupName] = useState(groupName);
  const [currentUserRole, setCurrentUserRole] = useState(initialRole);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { client: ablyClient } = useAbly();
  const { isOnline } = usePresence();
  const { typingDisplay, typingCount, onKeyStroke, onMessageSent } =
    useGroupTyping(groupConversationId, currentUserId, currentUserName);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Mark group conversation as read when receiving messages from other users
  const markAsRead = useCallback(() => {
    if (!showReadReceipts) return;
    fetch(`/api/chat/group/${groupConversationId}/read`, {
      method: "POST",
    }).catch(() => {});
  }, [groupConversationId, showReadReceipts]);

  // Subscribe to Ably channel for real-time messages, reactions, read receipts, and group events
  useEffect(() => {
    if (!ablyClient) return;

    const channel = ablyClient.channels.get(`group:${groupConversationId}`);

    const onMessage = (msg: Ably.InboundMessage) => {
      const data = msg.data as GroupMessage;
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, { ...data, reactions: data.reactions || [] }];
      });
      // Auto-mark as read when we receive a message from another user
      if (data.senderId !== currentUserId) {
        markAsRead();
      }
    };

    const onReaction = (msg: Ably.InboundMessage) => {
      const data = msg.data as ReactionEvent;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== data.messageId) return m;
          if (data.action === "add") {
            const already = m.reactions.some(
              (r) => r.emoji === data.emoji && r.userId === data.userId
            );
            if (already) return m;
            return {
              ...m,
              reactions: [
                ...m.reactions,
                { emoji: data.emoji, userId: data.userId },
              ],
            };
          } else {
            return {
              ...m,
              reactions: m.reactions.filter(
                (r) => !(r.emoji === data.emoji && r.userId === data.userId)
              ),
            };
          }
        })
      );
    };

    const onEdit = (msg: Ably.InboundMessage) => {
      const data = msg.data as GroupMessage;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.id
            ? { ...m, content: data.content, editedAt: data.editedAt }
            : m
        )
      );
    };

    const onRead = (msg: Ably.InboundMessage) => {
      const data = msg.data as ReadEvent;
      if (data.userId !== currentUserId && showReadReceipts) {
        setMemberReadReceipts((prev) => ({
          ...prev,
          [data.userId]: data.readAt,
        }));
      }
    };

    const onMemberAdded = (msg: Ably.InboundMessage) => {
      const data = msg.data as GroupMemberInfo;
      setMembers((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    };

    const onMemberRemoved = (msg: Ably.InboundMessage) => {
      const data = msg.data as { userId: string };
      setMembers((prev) => prev.filter((m) => m.id !== data.userId));
    };

    const onMemberUpdated = (msg: Ably.InboundMessage) => {
      const data = msg.data as GroupMemberInfo;
      setMembers((prev) =>
        prev.map((m) => (m.id === data.id ? { ...m, ...data } : m))
      );
      if (data.id === currentUserId && data.role) {
        setCurrentUserRole(data.role);
      }
    };

    const onGroupUpdate = (msg: Ably.InboundMessage) => {
      const data = msg.data as { name?: string };
      if (data.name) {
        setLocalGroupName(data.name);
      }
    };

    channel.subscribe("message", onMessage);
    channel.subscribe("reaction", onReaction);
    channel.subscribe("edit", onEdit);
    channel.subscribe("read", onRead);
    channel.subscribe("member-added", onMemberAdded);
    channel.subscribe("member-removed", onMemberRemoved);
    channel.subscribe("member-updated", onMemberUpdated);
    channel.subscribe("group-update", onGroupUpdate);

    return () => {
      channel.unsubscribe("message", onMessage);
      channel.unsubscribe("reaction", onReaction);
      channel.unsubscribe("edit", onEdit);
      channel.unsubscribe("read", onRead);
      channel.unsubscribe("member-added", onMemberAdded);
      channel.unsubscribe("member-removed", onMemberRemoved);
      channel.unsubscribe("member-updated", onMemberUpdated);
      channel.unsubscribe("group-update", onGroupUpdate);
    };
  }, [
    ablyClient,
    groupConversationId,
    currentUserId,
    showReadReceipts,
    markAsRead,
  ]);

  // Compute per-member read receipt positions: for each non-self member,
  // find the latest message where createdAt <= member.lastReadAt
  const memberReadPositions: Map<string, string[]> = (() => {
    if (!showReadReceipts) return new Map<string, string[]>();
    const messageIdToMembers = new Map<string, string[]>();

    for (const member of members) {
      if (member.id === currentUserId) continue;
      const lastReadAt = memberReadReceipts[member.id];
      if (!lastReadAt) continue;

      // Find the latest message where createdAt <= lastReadAt
      let lastReadMsgId: string | null = null;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].createdAt <= lastReadAt) {
          lastReadMsgId = messages[i].id;
          break;
        }
      }
      if (lastReadMsgId) {
        const existing = messageIdToMembers.get(lastReadMsgId) || [];
        existing.push(member.id);
        messageIdToMembers.set(lastReadMsgId, existing);
      }
    }

    return messageIdToMembers;
  })();

  function getMemberById(id: string): GroupMemberInfo | undefined {
    return members.find((m) => m.id === id);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setSelectedFile(file);
    // Reset the input so the same file can be re-selected
    e.target.value = "";
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    setUploadError(null);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if ((!text && !selectedFile) || sending) return;

    setSending(true);
    setInput("");
    setUploadError(null);
    onMessageSent();
    const fileToSend = selectedFile;
    const replyTo = replyingToMessage;
    setSelectedFile(null);
    setReplyingToMessage(null);

    try {
      let res: Response;

      if (fileToSend) {
        const formData = new FormData();
        formData.append("file", fileToSend);
        if (text) formData.append("content", text);
        if (replyTo) formData.append("replyToId", replyTo.id);

        res = await fetch(
          `/api/chat/group/${groupConversationId}/messages`,
          {
            method: "POST",
            body: formData,
          }
        );
      } else {
        res = await fetch(
          `/api/chat/group/${groupConversationId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: text,
              ...(replyTo ? { replyToId: replyTo.id } : {}),
            }),
          }
        );
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setUploadError(data?.error || "Failed to send message");
        return;
      }

      const message: GroupMessage = await res.json();

      // Add to local state (dedupe in case Ably already delivered it)
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, { ...message, reactions: message.reactions || [] }];
      });
    } finally {
      setSending(false);
    }
  }

  async function handleReaction(messageId: string, emoji: string) {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    const hasReacted = msg.reactions.some(
      (r) => r.emoji === emoji && r.userId === currentUserId
    );

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        if (hasReacted) {
          return {
            ...m,
            reactions: m.reactions.filter(
              (r) => !(r.emoji === emoji && r.userId === currentUserId)
            ),
          };
        } else {
          return {
            ...m,
            reactions: [...m.reactions, { emoji, userId: currentUserId }],
          };
        }
      })
    );

    setPickerOpenFor(null);
    setFullPickerOpenFor(null);

    try {
      const res = await fetch(
        `/api/chat/group/${groupConversationId}/messages/${messageId}/reactions`,
        {
          method: hasReacted ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
        }
      );

      if (!res.ok) {
        // Revert optimistic update on failure
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;
            if (hasReacted) {
              return {
                ...m,
                reactions: [...m.reactions, { emoji, userId: currentUserId }],
              };
            } else {
              return {
                ...m,
                reactions: m.reactions.filter(
                  (r) => !(r.emoji === emoji && r.userId === currentUserId)
                ),
              };
            }
          })
        );
      }
    } catch {
      // Revert on network error
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          if (hasReacted) {
            return {
              ...m,
              reactions: [...m.reactions, { emoji, userId: currentUserId }],
            };
          } else {
            return {
              ...m,
              reactions: m.reactions.filter(
                (r) => !(r.emoji === emoji && r.userId === currentUserId)
              ),
            };
          }
        })
      );
    }
  }

  function handleEditStart(msg: GroupMessage) {
    setEditingMessageId(msg.id);
    setEditInput(msg.content);
  }

  function handleEditCancel() {
    setEditingMessageId(null);
    setEditInput("");
  }

  function handleReplyStart(msg: GroupMessage) {
    setReplyingToMessage(msg);
  }

  function handleReplyCancel() {
    setReplyingToMessage(null);
  }

  async function handleEditSave(messageId: string) {
    const text = editInput.trim();
    if (!text) return;

    const originalMessage = messages.find((m) => m.id === messageId);
    if (!originalMessage || originalMessage.content === text) {
      handleEditCancel();
      return;
    }

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, content: text, editedAt: new Date().toISOString() }
          : m
      )
    );
    setEditingMessageId(null);
    setEditInput("");

    try {
      const res = await fetch(
        `/api/chat/group/${groupConversationId}/messages/${messageId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        }
      );

      if (!res.ok) {
        // Revert optimistic update
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  content: originalMessage.content,
                  editedAt: originalMessage.editedAt,
                }
              : m
          )
        );
      }
    } catch {
      // Revert on network error
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                content: originalMessage.content,
                editedAt: originalMessage.editedAt,
              }
            : m
        )
      );
    }
  }

  return (
    <div className="flex h-dvh">
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <Link
            href="/chat"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            &larr; Back
          </Link>
          <span className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {localGroupName}
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
              {members.length} {members.length === 1 ? "member" : "members"}
            </span>
          </span>
          <button
            onClick={() => setShowInfoPanel((prev) => !prev)}
            aria-label="Toggle group info"
            className="ml-auto rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            {showInfoPanel ? "Hide Info" : "Group Info"}
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              No messages yet. Say hello!
            </p>
          )}
          <div className="mx-auto flex max-w-2xl flex-col gap-2">
            {messages.map((msg) => {
              const isMine = msg.senderId === currentUserId;
              const grouped = groupReactions(msg.reactions);
              const hasReactions = grouped.size > 0;
              const readByMembers = memberReadPositions.get(msg.id) || [];
              const hasMedia = !!msg.mediaUrl;
              const isImage = msg.mediaMimeType?.startsWith("image/");
              const isVideo = msg.mediaMimeType?.startsWith("video/");
              const senderMember = !isMine
                ? getMemberById(msg.senderId)
                : undefined;
              return (
                <div
                  key={msg.id}
                  data-message-id={msg.id}
                  className={`group relative flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  {/* Avatar for other users */}
                  {!isMine && (
                    <div className="mr-2 flex-shrink-0 pt-1">
                      {senderMember?.avatarUrl ? (
                        <Image
                          src={senderMember.avatarUrl}
                          alt={senderMember.name || "User"}
                          width={24}
                          height={24}
                          className="rounded-full"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-300 text-[10px] font-medium text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200">
                          {getInitials(msg.senderName)}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="max-w-[75%]">
                    <div
                      className={`rounded-lg px-3 py-2 text-sm ${
                        isMine
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                      }`}
                    >
                      {/* Sender name for other users */}
                      {!isMine && (
                        <p className="mb-0.5 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                          {msg.senderName || "Unknown"}
                        </p>
                      )}

                      {/* Reply preview */}
                      {msg.replyTo && (
                        <div
                          data-testid="reply-preview"
                          className={`mb-1 border-l-2 pl-2 text-xs ${
                            isMine
                              ? "border-zinc-500 text-zinc-300 dark:border-zinc-400 dark:text-zinc-500"
                              : "border-zinc-400 text-zinc-500 dark:border-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          <span className="font-medium">
                            {msg.replyTo.senderName || "Unknown"}
                          </span>
                          <p className="truncate">
                            {msg.replyTo.content
                              ? msg.replyTo.content.length > 100
                                ? msg.replyTo.content.slice(0, 100) + "..."
                                : msg.replyTo.content
                              : "[Media]"}
                          </p>
                        </div>
                      )}

                      {/* Media attachment */}
                      {hasMedia && isImage && (
                        <div data-testid="chat-media" className="mb-1">
                          <Image
                            src={msg.mediaUrl!}
                            alt="Shared image"
                            width={400}
                            height={300}
                            className="max-h-64 w-auto rounded object-contain"
                            unoptimized
                          />
                        </div>
                      )}
                      {hasMedia && isVideo && (
                        <div data-testid="chat-media" className="mb-1">
                          <video
                            src={msg.mediaUrl!}
                            controls
                            className="max-h-64 w-full rounded"
                            preload="metadata"
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      )}

                      {editingMessageId === msg.id ? (
                        <form
                          data-testid="edit-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleEditSave(msg.id);
                          }}
                          className="flex flex-col gap-1"
                        >
                          <input
                            type="text"
                            data-testid="edit-input"
                            value={editInput}
                            onChange={(e) => setEditInput(e.target.value)}
                            className="rounded border border-zinc-400 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Escape") handleEditCancel();
                            }}
                          />
                          <div className="flex gap-1">
                            <button
                              type="submit"
                              className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={handleEditCancel}
                              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          {msg.content && (
                            <p className="whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          )}
                          <span className="mt-1 flex items-center gap-1 text-xs opacity-60">
                            <time>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </time>
                            {msg.editedAt && (
                              <span data-testid="edited-indicator">
                                (edited)
                              </span>
                            )}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Read receipts: tiny member avatars */}
                    {showReadReceipts && readByMembers.length > 0 && (
                      <div
                        data-testid="read-receipt"
                        className="mt-0.5 flex justify-end gap-0.5"
                      >
                        {readByMembers.map((memberId) => {
                          const member = getMemberById(memberId);
                          if (!member) return null;
                          return member.avatarUrl ? (
                            <Image
                              key={memberId}
                              src={member.avatarUrl}
                              alt={member.name || "Member"}
                              width={16}
                              height={16}
                              className="rounded-full"
                              unoptimized
                            />
                          ) : (
                            <div
                              key={memberId}
                              className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-300 text-[8px] font-medium text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200"
                              title={member.name || "Member"}
                            >
                              {getInitials(member.name)}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Reactions display */}
                    {hasReactions && (
                      <div
                        data-testid="reactions"
                        className="mt-1 flex flex-wrap gap-1"
                      >
                        {Array.from(grouped.entries()).map(
                          ([emoji, userIds]) => {
                            const iReacted = userIds.includes(currentUserId);
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg.id, emoji)}
                                aria-label={emoji}
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                                  iReacted
                                    ? "border-blue-300 bg-blue-100 dark:border-blue-700 dark:bg-blue-900"
                                    : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
                                }`}
                              >
                                {emoji} {userIds.length}
                              </button>
                            );
                          }
                        )}
                      </div>
                    )}

                    {/* Emoji picker & edit */}
                    <div className="relative flex items-center gap-2">
                      <button
                        onClick={() =>
                          setPickerOpenFor(
                            pickerOpenFor === msg.id ? null : msg.id
                          )
                        }
                        aria-label="add reaction"
                        className="mt-1 text-zinc-400 opacity-0 transition-opacity hover:text-zinc-600 group-hover:opacity-100 focus:opacity-100 dark:hover:text-zinc-300"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-5 w-5"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.536-4.464a.75.75 0 10-1.06-1.06 3.5 3.5 0 01-4.95 0 .75.75 0 00-1.06 1.06 5 5 0 007.07 0zM9 8.5c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S7.448 7 8 7s1 .672 1 1.5zm3 1.5c.552 0 1-.672 1-1.5S12.552 7 12 7s-1 .672-1 1.5.448 1.5 1 1.5z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      {!editingMessageId && (
                        <button
                          onClick={() => handleReplyStart(msg)}
                          aria-label="reply to message"
                          className="mt-1 text-xs text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                        >
                          Reply
                        </button>
                      )}
                      {isMine && !editingMessageId && (
                        <button
                          onClick={() => handleEditStart(msg)}
                          aria-label="edit message"
                          className="mt-1 text-xs text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                        >
                          Edit
                        </button>
                      )}
                      {pickerOpenFor === msg.id && (
                        <div
                          data-testid="quick-reactions"
                          className="absolute bottom-full left-0 z-10 mb-1 flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 shadow-md dark:border-zinc-700 dark:bg-zinc-800"
                        >
                          {EMOJI_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              aria-label={emoji}
                              className="rounded p-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
                            >
                              {emoji}
                            </button>
                          ))}
                          <div className="mx-0.5 h-5 w-px bg-zinc-200 dark:bg-zinc-600" />
                          <button
                            onClick={() => {
                              setPickerOpenFor(null);
                              setFullPickerOpenFor(msg.id);
                            }}
                            aria-label="open emoji menu"
                            title="Browse all emoji"
                            className="rounded p-1 text-sm text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-4 w-4"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.536-4.464a.75.75 0 10-1.06-1.06 3.5 3.5 0 01-4.95 0 .75.75 0 00-1.06 1.06 5 5 0 007.07 0zM9 8.5c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S7.448 7 8 7s1 .672 1 1.5zm3 1.5c.552 0 1-.672 1-1.5S12.552 7 12 7s-1 .672-1 1.5.448 1.5 1 1.5z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                      {fullPickerOpenFor === msg.id && (
                        <div className="absolute bottom-full left-0 z-20 mb-1">
                          <EmojiPicker
                            onSelect={(emoji) =>
                              handleReaction(msg.id, emoji)
                            }
                            onClose={() => setFullPickerOpenFor(null)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Typing indicator */}
        {typingCount > 0 && (
          <div data-testid="typing-indicator" className="px-4 py-1">
            <p className="mx-auto max-w-2xl text-xs text-zinc-400 dark:text-zinc-500">
              {typingDisplay}
            </p>
          </div>
        )}

        {/* File preview */}
        {selectedFile && (
          <div
            data-testid="file-preview"
            className="border-t border-zinc-200 px-4 py-2 dark:border-zinc-800"
          >
            <div className="mx-auto flex max-w-2xl items-center gap-2">
              <span className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </span>
              <button
                type="button"
                onClick={clearSelectedFile}
                aria-label="Remove file"
                className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {/* Upload error */}
        {uploadError && (
          <div
            data-testid="upload-error"
            className="border-t border-red-200 bg-red-50 px-4 py-2 dark:border-red-900 dark:bg-red-950"
          >
            <p className="mx-auto max-w-2xl text-sm text-red-600 dark:text-red-400">
              {uploadError}
            </p>
          </div>
        )}

        {/* Reply compose bar */}
        {replyingToMessage && (
          <div
            data-testid="reply-compose-bar"
            className="border-t border-zinc-200 px-4 py-2 dark:border-zinc-800"
          >
            <div className="mx-auto flex max-w-2xl items-center gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Replying to{" "}
                </span>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {replyingToMessage.senderId === currentUserId
                    ? "yourself"
                    : replyingToMessage.senderName || "Unknown"}
                </span>
                <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">
                  {replyingToMessage.content
                    ? replyingToMessage.content.length > 80
                      ? replyingToMessage.content.slice(0, 80) + "..."
                      : replyingToMessage.content
                    : replyingToMessage.mediaUrl
                      ? "[Media]"
                      : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={handleReplyCancel}
                aria-label="Cancel reply"
                className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800"
        >
          <div className="mx-auto flex max-w-2xl gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="file-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach file"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path
                  fillRule="evenodd"
                  d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.587 1.595l3.454-3.553a3 3 0 0 0 0-4.242Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                onKeyStroke();
              }}
              placeholder="Type a message..."
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <button
              type="submit"
              disabled={sending || (!input.trim() && !selectedFile)}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Send
            </button>
          </div>
        </form>
      </div>

      {/* Group Info Panel sidebar */}
      {showInfoPanel && (
        <GroupInfoPanel
          groupConversationId={groupConversationId}
          groupName={localGroupName}
          members={members}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setShowInfoPanel(false)}
          onGroupUpdate={(name) => setLocalGroupName(name)}
          onMembersChange={(updatedMembers) => setMembers(updatedMembers)}
        />
      )}
    </div>
  );
}
