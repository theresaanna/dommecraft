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
      <div className="text-sm text-zinc-400 dark:text-zinc-500">Loading...</div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {friendStatus === "none" && (
        <button
          onClick={sendRequest}
          disabled={acting}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Send Friend Request
        </button>
      )}

      {friendStatus === "pending_sent" && (
        <button
          disabled
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-500 dark:border-zinc-600 dark:text-zinc-400"
        >
          Request Pending
        </button>
      )}

      {friendStatus === "pending_received" && (
        <>
          <button
            onClick={() => respond("accept")}
            disabled={acting}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Accept Request
          </button>
          <button
            onClick={() => respond("reject")}
            disabled={acting}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Remove Friend
          </button>
          <button
            onClick={openChat}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Message {targetUserName}
          </button>
        </>
      )}
    </div>
  );
}
