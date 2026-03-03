-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'GBP', 'AUD', 'EUR');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'USD';
