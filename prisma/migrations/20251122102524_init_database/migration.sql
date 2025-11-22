-- CreateEnum
CREATE TYPE "commandes_statut" AS ENUM ('En attente', 'En préparation', 'Prête pour livraison', 'En cours de livraison', 'Livrée', 'Annulée', 'Remboursée');

-- CreateEnum
CREATE TYPE "reclamations_statut" AS ENUM ('En attente de traitement', 'En cours', 'Rejetée', 'Remboursée');

-- CreateTable
CREATE TABLE "article_commandes" (
    "id" BIGSERIAL NOT NULL,
    "article_id" BIGINT NOT NULL,
    "commande_id" BIGINT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prix" INTEGER NOT NULL,
    "reduction" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_commandes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" BIGSERIAL NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),
    "prix" INTEGER NOT NULL,
    "prixPromotion" INTEGER,
    "isPromotion" BOOLEAN NOT NULL DEFAULT false,
    "pourcentageReduction" INTEGER NOT NULL DEFAULT 0,
    "madeInGabon" BOOLEAN NOT NULL DEFAULT false,
    "user_id" BIGINT NOT NULL,
    "categorie" VARCHAR(255) NOT NULL,
    "image_principale" VARCHAR(255),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commande_articles" (
    "id" BIGSERIAL NOT NULL,
    "commande_id" BIGINT NOT NULL,
    "article_id" BIGINT NOT NULL,
    "variation_id" BIGINT,
    "quantite" INTEGER NOT NULL,
    "prix_unitaire" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commande_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commandes" (
    "id" BIGSERIAL NOT NULL,
    "numero" VARCHAR(255) NOT NULL,
    "statut" "commandes_statut" NOT NULL DEFAULT 'En attente',
    "prix" INTEGER NOT NULL,
    "commentaire" VARCHAR(255) NOT NULL,
    "isLivrable" BOOLEAN NOT NULL,
    "user_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "adresse_livraison" VARCHAR(255) NOT NULL,

    CONSTRAINT "commandes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_articles" (
    "id" BIGSERIAL NOT NULL,
    "url_photo" VARCHAR(255) NOT NULL,
    "variation_id" BIGINT,
    "article_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "livraisons" (
    "id" BIGSERIAL NOT NULL,
    "adresse" VARCHAR(255) NOT NULL,
    "details" VARCHAR(255) NOT NULL,
    "statut" VARCHAR(255) NOT NULL,
    "date_livraison" TIMESTAMP(3) NOT NULL,
    "ville" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(255) NOT NULL,
    "commande_id" BIGINT NOT NULL,
    "user_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "livraisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicites" (
    "id" BIGSERIAL NOT NULL,
    "date_start" TIMESTAMP(3) NOT NULL,
    "date_end" TIMESTAMP(3) NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "url_image" VARCHAR(255) NOT NULL,
    "lien" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "isActif" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publicites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reclamations" (
    "id" BIGSERIAL NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(255) NOT NULL,
    "statut" "reclamations_statut" NOT NULL DEFAULT 'En attente de traitement',
    "commande_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reclamations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" BIGSERIAL NOT NULL,
    "variation_id" BIGINT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "auth_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "role" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "url_logo" VARCHAR(255),
    "phone" VARCHAR(255),
    "heure_ouverture" TEXT,
    "heure_fermeture" TEXT,
    "description" TEXT,
    "solde" INTEGER NOT NULL DEFAULT 0,
    "email_verified_at" TIMESTAMP(3),
    "password" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" BIGSERIAL NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variations" (
    "id" BIGSERIAL NOT NULL,
    "article_id" BIGINT NOT NULL,
    "couleur" VARCHAR(255),
    "taille" VARCHAR(255),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "prix" INTEGER,
    "image" VARCHAR(255),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "variations_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "stocks_variation_id_idx" ON "stocks"("variation_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_id_key" ON "users"("auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "accounts_provider_provider_account_id_idx" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

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
