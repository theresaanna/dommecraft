import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAblyRest } from "@/lib/ably";
import { put } from "@vercel/blob";
import { scanFile } from "@/lib/arachnid-shield";
import { isGroupMember } from "@/lib/group-chat-access";

const PAGE_SIZE = 50;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const group = await prisma.groupConversation.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!group) {
    return NextResponse.json(
      { error: "Group not found" },
      { status: 404 }
    );
  }

  const { isMember } = await isGroupMember(id, userId);
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const before = url.searchParams.get("before");

  const messages = await prisma.chatMessage.findMany({
    where: {
      groupConversationId: id,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: PAGE_SIZE,
    select: {
      id: true,
      senderId: true,
      content: true,
      mediaUrl: true,
      mediaMimeType: true,
      mediaFileSize: true,
      editedAt: true,
      createdAt: true,
      reactions: { select: { emoji: true, userId: true } },
      replyTo: {
        select: {
          id: true,
          content: true,
          senderId: true,
          sender: { select: { name: true } },
        },
      },
      sender: { select: { name: true } },
    },
  });

  return NextResponse.json(
    messages.map((m) => ({
      ...m,
      senderName: m.sender.name,
      editedAt: m.editedAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
      replyTo: m.replyTo
        ? {
            id: m.replyTo.id,
            content: m.replyTo.content,
            senderName: m.replyTo.sender.name,
          }
        : null,
    }))
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const group = await prisma.groupConversation.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!group) {
    return NextResponse.json(
      { error: "Group not found" },
      { status: 404 }
    );
  }

  const { isMember } = await isGroupMember(id, userId);
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Determine if the request is a file upload (FormData) or text-only (JSON)
  const contentType = request.headers.get("content-type") || "";
  let content = "";
  let mediaUrl: string | null = null;
  let mediaMimeType: string | null = null;
  let mediaFileSize: number | null = null;
  let replyToId: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    content = ((formData.get("content") as string) || "").trim();
    replyToId = ((formData.get("replyToId") as string) || "").trim() || null;
    const file = formData.get("file") as File | null;

    if (!file && !content) {
      return NextResponse.json(
        { error: "Message must include text or a file" },
        { status: 400 }
      );
    }

    if (file) {
      if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "File type not allowed. Supported: images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, MOV)" },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "File size exceeds 10MB limit" },
          { status: 400 }
        );
      }

      // CSAM scan via Project Arachnid Shield
      const { safe } = await scanFile(file);
      if (!safe) {
        return NextResponse.json(
          { error: "File rejected by content safety scan" },
          { status: 400 }
        );
      }

      // Upload to Vercel Blob
      const pathname = `chat/group/${id}/${userId}/${file.name}`;
      const blob = await put(pathname, file, { access: "public", allowOverwrite: true });
      mediaUrl = blob.url;
      mediaMimeType = file.type;
      mediaFileSize = file.size;
    }
  } else {
    const body = await request.json();
    const rawContent = body.content;
    replyToId = body.replyToId || null;

    if (!rawContent || typeof rawContent !== "string" || rawContent.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    content = rawContent.trim();
  }

  // Validate replyToId if provided
  if (replyToId) {
    const replyTarget = await prisma.chatMessage.findUnique({
      where: { id: replyToId },
      select: { groupConversationId: true },
    });
    if (!replyTarget || replyTarget.groupConversationId !== id) {
      return NextResponse.json(
        { error: "Reply target message not found in this group" },
        { status: 400 }
      );
    }
  }

  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        groupConversationId: id,
        senderId: userId,
        content,
        ...(mediaUrl ? { mediaUrl, mediaMimeType, mediaFileSize } : {}),
        ...(replyToId ? { replyToId } : {}),
      },
      select: {
        id: true,
        senderId: true,
        content: true,
        mediaUrl: true,
        mediaMimeType: true,
        mediaFileSize: true,
        editedAt: true,
        createdAt: true,
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
            sender: { select: { name: true } },
          },
        },
        sender: { select: { name: true } },
      },
    }),
    prisma.groupConversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    }),
  ]);

  const senderName = message.sender.name;

  const messageData = {
    ...message,
    senderName,
    editedAt: message.editedAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
    replyTo: message.replyTo
      ? {
          id: message.replyTo.id,
          content: message.replyTo.content,
          senderName: message.replyTo.sender.name,
        }
      : null,
  };

  // Publish to Ably so group members get the message in real-time
  try {
    const rest = getAblyRest();
    const channel = rest.channels.get(`group:${id}`);
    await channel.publish("message", messageData);
  } catch {
    // Non-fatal: message is persisted, real-time delivery failed
  }

  // Create or update notifications for all other group members
  const chatLinkUrl = `/chat/group/${id}`;

  try {
    const otherMembers = await prisma.groupMember.findMany({
      where: { groupConversationId: id, userId: { not: userId } },
      select: { userId: true },
    });

    const rest = getAblyRest();

    for (const member of otherMembers) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: member.userId,
          type: "GROUP_CHAT_MESSAGE",
          isRead: false,
          linkUrl: chatLinkUrl,
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.notification.update({
          where: { id: existing.id },
          data: { createdAt: new Date() },
        });
      } else {
        await prisma.notification.create({
          data: {
            userId: member.userId,
            type: "GROUP_CHAT_MESSAGE",
            message: `New message from ${senderName ?? "Someone"} in group chat`,
            linkUrl: chatLinkUrl,
          },
        });
      }

      // Push real-time notification so members' notification providers poll immediately
      try {
        const notifyChannel = rest.channels.get(
          `user-notifications:${member.userId}`
        );
        await notifyChannel.publish("notify", {
          type: "GROUP_CHAT_MESSAGE",
        });
      } catch {
        // Non-fatal per member
      }
    }
  } catch {
    // Non-fatal: message is persisted, notification creation failed
  }

  return NextResponse.json(messageData, { status: 201 });
}
