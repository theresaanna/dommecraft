-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateTable
CREATE TABLE "sub_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "contact_info" TEXT,
    "arrangement_type" TEXT[],
    "sub_type" TEXT[],
    "timezone" TEXT,
    "soft_limits" TEXT[],
    "hard_limits" TEXT[],
    "birthday" TIMESTAMP(3),
    "country" TEXT,
    "occupation" TEXT,
    "work_schedule" TEXT,
    "financial_limits" TEXT,
    "expendable_income" TEXT,
    "preferences" TEXT[],
    "best_experiences" TEXT,
    "worst_experiences" TEXT,
    "personality_notes" TEXT,
    "health_notes" TEXT,
    "obedience_history" TEXT,
    "avatar_url" TEXT,
    "tags" TEXT[],
    "private_notes" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sub_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sub_id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "mime_type" TEXT,
    "file_size" INTEGER,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sub_id" TEXT NOT NULL,
    "overall" INTEGER NOT NULL,
    "categories" JSONB,
    "notes" TEXT,
    "rated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "behavior_scores" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sub_id" TEXT NOT NULL,
    "overall" INTEGER NOT NULL,
    "breakdown" JSONB,
    "notes" TEXT,
    "scored_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "behavior_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sub_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "file_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sub_profiles_user_id_idx" ON "sub_profiles"("user_id");

-- CreateIndex
CREATE INDEX "sub_profiles_user_id_full_name_idx" ON "sub_profiles"("user_id", "full_name");

-- CreateIndex
CREATE INDEX "badges_sub_id_idx" ON "badges"("sub_id");

-- CreateIndex
CREATE INDEX "media_items_sub_id_idx" ON "media_items"("sub_id");

-- CreateIndex
CREATE INDEX "ratings_sub_id_idx" ON "ratings"("sub_id");

-- CreateIndex
CREATE INDEX "behavior_scores_sub_id_idx" ON "behavior_scores"("sub_id");

-- CreateIndex
CREATE INDEX "contracts_sub_id_idx" ON "contracts"("sub_id");

-- AddForeignKey
ALTER TABLE "sub_profiles" ADD CONSTRAINT "sub_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_sub_id_fkey" FOREIGN KEY ("sub_id") REFERENCES "sub_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_sub_id_fkey" FOREIGN KEY ("sub_id") REFERENCES "sub_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_sub_id_fkey" FOREIGN KEY ("sub_id") REFERENCES "sub_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_scores" ADD CONSTRAINT "behavior_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_scores" ADD CONSTRAINT "behavior_scores_sub_id_fkey" FOREIGN KEY ("sub_id") REFERENCES "sub_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_sub_id_fkey" FOREIGN KEY ("sub_id") REFERENCES "sub_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
