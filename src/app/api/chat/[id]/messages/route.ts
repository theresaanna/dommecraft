import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAblyRest } from "@/lib/ably";
import { put } from "@vercel/blob";
import { scanFile } from "@/lib/arachnid-shield";

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

  const { id: conversationId } = await params;
  const userId = session.user.id;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { participant1Id: true, participant2Id: true },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  if (
    conversation.participant1Id !== userId &&
    conversation.participant2Id !== userId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const before = url.searchParams.get("before");

  const messages = await prisma.chatMessage.findMany({
    where: {
      conversationId,
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
      createdAt: true,
      reactions: { select: { emoji: true, userId: true } },
    },
  });

  return NextResponse.json(
    messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
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

  const { id: conversationId } = await params;
  const userId = session.user.id;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { participant1Id: true, participant2Id: true },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  if (
    conversation.participant1Id !== userId &&
    conversation.participant2Id !== userId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Determine if the request is a file upload (FormData) or text-only (JSON)
  const contentType = request.headers.get("content-type") || "";
  let content = "";
  let mediaUrl: string | null = null;
  let mediaMimeType: string | null = null;
  let mediaFileSize: number | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    content = ((formData.get("content") as string) || "").trim();
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
      const pathname = `chat/${conversationId}/${userId}/${file.name}`;
      const blob = await put(pathname, file, { access: "public", allowOverwrite: true });
      mediaUrl = blob.url;
      mediaMimeType = file.type;
      mediaFileSize = file.size;
    }
  } else {
    const body = await request.json();
    const rawContent = body.content;

    if (!rawContent || typeof rawContent !== "string" || rawContent.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    content = rawContent.trim();
  }

  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: userId,
        content,
        ...(mediaUrl ? { mediaUrl, mediaMimeType, mediaFileSize } : {}),
      },
      select: {
        id: true,
        senderId: true,
        content: true,
        mediaUrl: true,
        mediaMimeType: true,
        mediaFileSize: true,
        createdAt: true,
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  const messageData = { ...message, createdAt: message.createdAt.toISOString() };

  // Publish to Ably so the other participant gets the message in real-time
  try {
    const rest = getAblyRest();
    const channel = rest.channels.get(`chat:${conversationId}`);
    await channel.publish("message", messageData);
  } catch {
    // Non-fatal: message is persisted, real-time delivery failed
  }

  // Create or update a chat notification for the recipient.
  // Only one unread notification per sender conversation is kept.
  const recipientId =
    conversation.participant1Id === userId
      ? conversation.participant2Id
      : conversation.participant1Id;
  const senderName = session.user.name || "Someone";
  const chatLinkUrl = `/chat/${conversationId}`;

  try {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: recipientId,
        type: "CHAT_MESSAGE",
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
          userId: recipientId,
          type: "CHAT_MESSAGE",
          message: `Received messages from ${senderName}`,
          linkUrl: chatLinkUrl,
        },
      });
    }
  } catch {
    // Non-fatal: message is persisted, notification creation failed
  }

  return NextResponse.json(messageData, { status: 201 });
}
