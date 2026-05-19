-- AlterTable
ALTER TABLE "users" ADD COLUMN "is_certified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "certified_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "certified_by" UUID;

-- CreateIndex
CREATE INDEX "users_is_certified_idx" ON "users"("is_certified");
