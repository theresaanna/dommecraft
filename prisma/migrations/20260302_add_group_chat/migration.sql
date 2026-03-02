-- CreateEnum
CREATE TYPE "GroupMemberRole" AS ENUM ('ADMIN', 'MEMBER');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'GROUP_CHAT_MESSAGE';

-- AlterTable: make conversation_id optional on chat_messages
ALTER TABLE "chat_messages" ALTER COLUMN "conversation_id" DROP NOT NULL;

-- AlterTable: add group_conversation_id to chat_messages
ALTER TABLE "chat_messages" ADD COLUMN "group_conversation_id" TEXT;

-- CreateTable: group_conversations
CREATE TABLE "group_conversations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: group_members
CREATE TABLE "group_members" (
    "id" TEXT NOT NULL,
    "group_conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "GroupMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_read_at" TIMESTAMP(3),

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_conversations_created_by_id_idx" ON "group_conversations"("created_by_id");

-- CreateIndex
CREATE INDEX "group_members_group_conversation_id_idx" ON "group_members"("group_conversation_id");

-- CreateIndex
CREATE INDEX "group_members_user_id_idx" ON "group_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_conversation_id_user_id_key" ON "group_members"("group_conversation_id", "user_id");

-- CreateIndex
CREATE INDEX "chat_messages_group_conversation_id_created_at_idx" ON "chat_messages"("group_conversation_id", "created_at");

-- AddForeignKey
ALTER TABLE "group_conversations" ADD CONSTRAINT "group_conversations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_conversation_id_fkey" FOREIGN KEY ("group_conversation_id") REFERENCES "group_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_group_conversation_id_fkey" FOREIGN KEY ("group_conversation_id") REFERENCES "group_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
