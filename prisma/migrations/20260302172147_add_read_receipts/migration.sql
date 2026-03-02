-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "participant1_last_read_at" TIMESTAMP(3),
ADD COLUMN     "participant2_last_read_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "show_read_receipts" BOOLEAN NOT NULL DEFAULT true;
