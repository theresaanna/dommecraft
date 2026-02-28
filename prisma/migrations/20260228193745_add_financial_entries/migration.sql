-- CreateTable
CREATE TABLE "financial_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sub_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "category" TEXT NOT NULL,
    "payment_method" TEXT,
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_in_app" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_entries_user_id_idx" ON "financial_entries"("user_id");

-- CreateIndex
CREATE INDEX "financial_entries_user_id_date_idx" ON "financial_entries"("user_id", "date");

-- CreateIndex
CREATE INDEX "financial_entries_user_id_sub_id_idx" ON "financial_entries"("user_id", "sub_id");

-- CreateIndex
CREATE INDEX "financial_entries_user_id_category_idx" ON "financial_entries"("user_id", "category");

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_sub_id_fkey" FOREIGN KEY ("sub_id") REFERENCES "sub_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
