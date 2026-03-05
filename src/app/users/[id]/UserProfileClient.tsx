"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type FriendStatus = "none" | "pending_sent" | "pending_received" | "accepted";

type StatusResponse = {
  status: FriendStatus;
  friendshipId?: string;
};

export default function UserProfileClient({
  targetUserId,
  targetUserName,
}: {
  targetUserId: string;
  targetUserName: string;
}) {
  const router = useRouter();
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/friends/status?userId=${targetUserId}`);
      if (res.ok) {
        const data: StatusResponse = await res.json();
        setFriendStatus(data.status);
        setFriendshipId(data.friendshipId ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function sendRequest() {
    setActing(true);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresseeId: targetUserId }),
      });
      if (res.ok) {
        setFriendStatus("pending_sent");
      }
    } finally {
      setActing(false);
    }
  }

  async function respond(action: "accept" | "reject") {
    if (!friendshipId) return;
    setActing(true);
    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action }),
      });
      if (res.ok) {
        setFriendStatus(action === "accept" ? "accepted" : "none");
        if (action !== "accept") setFriendshipId(null);
      }
    } finally {
      setActing(false);
    }
  }

  async function removeFriend() {
    if (!friendshipId) return;
    setActing(true);
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFriendStatus("none");
        setFriendshipId(null);
      }
    } finally {
      setActing(false);
    }
  }

  async function openChat() {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: targetUserId }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/chat/${data.id}`);
    }
  }

  if (loading) {
    return (
      <div className="text-base text-zinc-400 dark:text-zinc-500">Loading...</div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {friendStatus === "none" && (
        <button
          onClick={sendRequest}
          disabled={acting}
          className="rounded-md bg-sky-300/30 backdrop-blur-sm border border-sky-400/30 px-4 py-2 text-base font-medium text-sky-900 transition-all hover:bg-sky-300/45 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] disabled:opacity-50 dark:border-[rgba(55,113,200,0.35)] dark:bg-[rgba(55,113,200,0.25)] dark:text-blue-100 dark:hover:bg-[rgba(55,113,200,0.4)] dark:hover:shadow-[0_0_20px_rgba(55,113,200,0.5)]"
        >
          Send Friend Request
        </button>
      )}

      {friendStatus === "pending_sent" && (
        <button
          disabled
          className="rounded-md border border-zinc-300 px-4 py-2 text-base font-medium text-zinc-500 dark:border-zinc-600 dark:text-zinc-400"
        >
          Request Pending
        </button>
      )}

      {friendStatus === "pending_received" && (
        <>
          <button
            onClick={() => respond("accept")}
            disabled={acting}
            className="rounded-md bg-sky-300/30 backdrop-blur-sm border border-sky-400/30 px-4 py-2 text-base font-medium text-sky-900 transition-all hover:bg-sky-300/45 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] disabled:opacity-50 dark:border-[rgba(55,113,200,0.35)] dark:bg-[rgba(55,113,200,0.25)] dark:text-blue-100 dark:hover:bg-[rgba(55,113,200,0.4)] dark:hover:shadow-[0_0_20px_rgba(55,113,200,0.5)]"
          >
            Accept Request
          </button>
          <button
            onClick={() => respond("reject")}
            disabled={acting}
            className="rounded-md border border-zinc-300 px-4 py-2 text-base font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Reject
          </button>
        </>
      )}

      {friendStatus === "accepted" && (
        <>
          <button
            onClick={removeFriend}
            disabled={acting}
            className="rounded-md border border-zinc-300 px-4 py-2 text-base font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Remove Friend
          </button>
          <button
            onClick={openChat}
            className="rounded-md bg-sky-300/30 backdrop-blur-sm border border-sky-400/30 px-4 py-2 text-base font-medium text-sky-900 transition-all hover:bg-sky-300/45 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] dark:border-[rgba(55,113,200,0.35)] dark:bg-[rgba(55,113,200,0.25)] dark:text-blue-100 dark:hover:bg-[rgba(55,113,200,0.4)] dark:hover:shadow-[0_0_20px_rgba(55,113,200,0.5)]"
          >
            Message {targetUserName}
          </button>
        </>
      )}
    </div>
  );
}
