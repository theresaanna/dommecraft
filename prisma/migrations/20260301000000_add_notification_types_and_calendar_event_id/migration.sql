-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CALENDAR_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'SUB_JOINED';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "calendar_event_id" TEXT;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_calendar_event_id_fkey" FOREIGN KEY ("calendar_event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
