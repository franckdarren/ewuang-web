/*
  Warnings:

  - The primary key for the `accounts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `article_commandes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `articles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `commande_articles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `variation_id` column on the `commande_articles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `commandes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `image_articles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `variation_id` column on the `image_articles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `livraisons` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `user_id` column on the `livraisons` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `publicites` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `reclamations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `stocks` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `email_verified_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - The primary key for the `variations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `accounts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `accounts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `article_commandes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `article_id` on the `article_commandes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `commande_id` on the `article_commandes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `articles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `articles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `commande_articles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `commande_id` on the `commande_articles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `article_id` on the `commande_articles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `commandes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `commandes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `image_articles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `article_id` on the `image_articles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `livraisons` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `commande_id` on the `livraisons` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `publicites` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `reclamations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `commande_id` on the `reclamations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `reclamations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `sessions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `sessions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `stocks` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `variation_id` on the `stocks` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `variations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `article_id` on the `variations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "article_commandes" DROP CONSTRAINT "article_commandes_article_id_fkey";

-- DropForeignKey
ALTER TABLE "article_commandes" DROP CONSTRAINT "article_commandes_commande_id_fkey";

-- DropForeignKey
ALTER TABLE "articles" DROP CONSTRAINT "articles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "commande_articles" DROP CONSTRAINT "commande_articles_article_id_fkey";

-- DropForeignKey
ALTER TABLE "commande_articles" DROP CONSTRAINT "commande_articles_commande_id_fkey";

-- DropForeignKey
ALTER TABLE "commande_articles" DROP CONSTRAINT "commande_articles_variation_id_fkey";

-- DropForeignKey
ALTER TABLE "commandes" DROP CONSTRAINT "commandes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "image_articles" DROP CONSTRAINT "image_articles_article_id_fkey";

-- DropForeignKey
ALTER TABLE "image_articles" DROP CONSTRAINT "image_articles_variation_id_fkey";

-- DropForeignKey
ALTER TABLE "livraisons" DROP CONSTRAINT "livraisons_commande_id_fkey";

-- DropForeignKey
ALTER TABLE "livraisons" DROP CONSTRAINT "livraisons_user_id_fkey";

-- DropForeignKey
ALTER TABLE "reclamations" DROP CONSTRAINT "reclamations_commande_id_fkey";

-- DropForeignKey
ALTER TABLE "reclamations" DROP CONSTRAINT "reclamations_user_id_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "stocks" DROP CONSTRAINT "stocks_variation_id_fkey";

-- DropForeignKey
ALTER TABLE "variations" DROP CONSTRAINT "variations_article_id_fkey";

-- AlterTable
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "article_commandes" DROP CONSTRAINT "article_commandes_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "article_id",
ADD COLUMN     "article_id" UUID NOT NULL,
DROP COLUMN "commande_id",
ADD COLUMN     "commande_id" UUID NOT NULL,
ADD CONSTRAINT "article_commandes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "articles" DROP CONSTRAINT "articles_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "articles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "commande_articles" DROP CONSTRAINT "commande_articles_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "commande_id",
ADD COLUMN     "commande_id" UUID NOT NULL,
DROP COLUMN "article_id",
ADD COLUMN     "article_id" UUID NOT NULL,
DROP COLUMN "variation_id",
ADD COLUMN     "variation_id" UUID,
ADD CONSTRAINT "commande_articles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "commandes" DROP CONSTRAINT "commandes_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "commandes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "image_articles" DROP CONSTRAINT "image_articles_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "variation_id",
ADD COLUMN     "variation_id" UUID,
DROP COLUMN "article_id",
ADD COLUMN     "article_id" UUID NOT NULL,
ADD CONSTRAINT "image_articles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "livraisons" DROP CONSTRAINT "livraisons_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "commande_id",
ADD COLUMN     "commande_id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID,
ADD CONSTRAINT "livraisons_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "publicites" DROP CONSTRAINT "publicites_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "publicites_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "reclamations" DROP CONSTRAINT "reclamations_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "commande_id",
ADD COLUMN     "commande_id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "reclamations_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "stocks" DROP CONSTRAINT "stocks_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "variation_id",
ADD COLUMN     "variation_id" UUID NOT NULL,
ADD CONSTRAINT "stocks_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "email_verified_at",
DROP COLUMN "password",
ADD COLUMN     "address" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "variations" DROP CONSTRAINT "variations_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "article_id",
ADD COLUMN     "article_id" UUID NOT NULL,
ADD CONSTRAINT "variations_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "article_commandes_article_id_idx" ON "article_commandes"("article_id");

-- CreateIndex
CREATE INDEX "article_commandes_commande_id_idx" ON "article_commandes"("commande_id");

-- CreateIndex
CREATE INDEX "articles_user_id_idx" ON "articles"("user_id");

-- CreateIndex
CREATE INDEX "commande_articles_article_id_idx" ON "commande_articles"("article_id");

-- CreateIndex
CREATE INDEX "commande_articles_commande_id_idx" ON "commande_articles"("commande_id");

-- CreateIndex
CREATE INDEX "commande_articles_variation_id_idx" ON "commande_articles"("variation_id");

-- CreateIndex
CREATE INDEX "commandes_user_id_idx" ON "commandes"("user_id");

-- CreateIndex
CREATE INDEX "image_articles_article_id_idx" ON "image_articles"("article_id");

-- CreateIndex
CREATE INDEX "image_articles_variation_id_idx" ON "image_articles"("variation_id");

-- CreateIndex
CREATE INDEX "livraisons_commande_id_idx" ON "livraisons"("commande_id");

-- CreateIndex
CREATE INDEX "livraisons_user_id_idx" ON "livraisons"("user_id");

-- CreateIndex
CREATE INDEX "reclamations_commande_id_idx" ON "reclamations"("commande_id");

-- CreateIndex
CREATE INDEX "reclamations_user_id_idx" ON "reclamations"("user_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "stocks_variation_id_idx" ON "stocks"("variation_id");

-- CreateIndex
CREATE INDEX "variations_article_id_idx" ON "variations"("article_id");

-- AddForeignKey
ALTER TABLE "article_commandes" ADD CONSTRAINT "article_commandes_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_commandes" ADD CONSTRAINT "article_commandes_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "commandes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_articles" ADD CONSTRAINT "commande_articles_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_articles" ADD CONSTRAINT "commande_articles_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "commandes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_articles" ADD CONSTRAINT "commande_articles_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "variations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_articles" ADD CONSTRAINT "image_articles_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_articles" ADD CONSTRAINT "image_articles_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "variations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livraisons" ADD CONSTRAINT "livraisons_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "commandes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livraisons" ADD CONSTRAINT "livraisons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reclamations" ADD CONSTRAINT "reclamations_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "commandes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reclamations" ADD CONSTRAINT "reclamations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "variations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variations" ADD CONSTRAINT "variations_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
