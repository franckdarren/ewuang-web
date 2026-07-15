-- AlterTable
ALTER TABLE "users" ADD COLUMN "slug" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "users_slug_key" ON "users"("slug");
