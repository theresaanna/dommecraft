-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN "media_url" TEXT,
ADD COLUMN "media_mime_type" TEXT,
ADD COLUMN "media_file_size" INTEGER;
