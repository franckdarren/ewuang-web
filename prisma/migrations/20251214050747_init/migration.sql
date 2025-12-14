-- CreateEnum
CREATE TYPE "commandes_statut" AS ENUM ('En attente', 'En préparation', 'Prête pour livraison', 'En cours de livraison', 'Livrée', 'Annulée', 'Remboursée');

-- CreateEnum
CREATE TYPE "reclamations_statut" AS ENUM ('En attente de traitement', 'En cours', 'Rejetée', 'Remboursée');

-- CreateEnum
CREATE TYPE "paiement_statut" AS ENUM ('En attente', 'Validé', 'Echoué', 'Remboursée');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('Commande', 'Livraison', 'Message', 'Promotion', 'Alerte stock', 'Avis', 'Système');

-- CreateTable
CREATE TABLE "article_commandes" (
    "id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "commande_id" UUID NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prix" INTEGER NOT NULL,
    "reduction" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_commandes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),
    "prix" INTEGER NOT NULL,
    "prix_promotion" INTEGER,
    "is_promotion" BOOLEAN NOT NULL DEFAULT false,
    "pourcentage_reduction" INTEGER NOT NULL DEFAULT 0,
    "made_in_gabon" BOOLEAN NOT NULL DEFAULT false,
    "user_id" UUID NOT NULL,
    "categorie_id" UUID,
    "image_principale" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commande_articles" (
    "id" UUID NOT NULL,
    "commande_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "variation_id" UUID,
    "quantite" INTEGER NOT NULL,
    "prix_unitaire" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commande_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commandes" (
    "id" UUID NOT NULL,
    "numero" VARCHAR(255) NOT NULL,
    "statut" "commandes_statut" NOT NULL DEFAULT 'En attente',
    "prix" INTEGER NOT NULL,
    "commentaire" VARCHAR(255) NOT NULL,
    "isLivrable" BOOLEAN NOT NULL,
    "user_id" UUID NOT NULL,
    "vendeur_id" UUID,
    "paiement_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "adresse_livraison" VARCHAR(255) NOT NULL,

    CONSTRAINT "commandes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_articles" (
    "id" UUID NOT NULL,
    "url_photo" VARCHAR(255) NOT NULL,
    "variation_id" UUID,
    "article_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "livraisons" (
    "id" UUID NOT NULL,
    "adresse" VARCHAR(255) NOT NULL,
    "details" VARCHAR(255) NOT NULL,
    "statut" VARCHAR(255) NOT NULL,
    "date_livraison" TIMESTAMP(3) NOT NULL,
    "ville" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(255) NOT NULL,
    "commande_id" UUID NOT NULL,
    "user_id" UUID,
    "livreur_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "livraisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicites" (
    "id" UUID NOT NULL,
    "date_start" TIMESTAMP(3) NOT NULL,
    "date_end" TIMESTAMP(3) NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "url_image" VARCHAR(255) NOT NULL,
    "lien" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "is_actif" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publicites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reclamations" (
    "id" UUID NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(255) NOT NULL,
    "statut" "reclamations_statut" NOT NULL DEFAULT 'En attente de traitement',
    "commande_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reponse" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reclamations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" UUID NOT NULL,
    "variation_id" UUID NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 0,
    "seuil_alerte" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "auth_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "role" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "url_logo" VARCHAR(255),
    "phone" VARCHAR(255),
    "heure_ouverture" TEXT,
    "heure_fermeture" TEXT,
    "description" TEXT,
    "address" TEXT,
    "solde" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variations" (
    "id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "couleur" VARCHAR(255),
    "taille" VARCHAR(255),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "prix" INTEGER,
    "image" VARCHAR(255),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "variations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favoris" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favoris_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avis" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "note" INTEGER NOT NULL,
    "commentaire" TEXT,
    "is_moderated" BOOLEAN NOT NULL DEFAULT false,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image" VARCHAR(255),
    "parent_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "montant" INTEGER NOT NULL,
    "methode" VARCHAR(50) NOT NULL,
    "statut" "paiement_statut" NOT NULL DEFAULT 'En attente',
    "reference" VARCHAR(255) NOT NULL,
    "transaction_id" VARCHAR(255),
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paiements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "notification_type" NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "lien" VARCHAR(255),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "receiver_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paniers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paniers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "panier_items" (
    "id" UUID NOT NULL,
    "panier_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "variation_id" UUID,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "panier_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "article_commandes_article_id_idx" ON "article_commandes"("article_id");

-- CreateIndex
CREATE INDEX "article_commandes_commande_id_idx" ON "article_commandes"("commande_id");

-- CreateIndex
CREATE INDEX "articles_user_id_idx" ON "articles"("user_id");

-- CreateIndex
CREATE INDEX "articles_categorie_id_idx" ON "articles"("categorie_id");

-- CreateIndex
CREATE INDEX "articles_is_promotion_idx" ON "articles"("is_promotion");

-- CreateIndex
CREATE INDEX "articles_is_active_idx" ON "articles"("is_active");

-- CreateIndex
CREATE INDEX "commande_articles_article_id_idx" ON "commande_articles"("article_id");

-- CreateIndex
CREATE INDEX "commande_articles_commande_id_idx" ON "commande_articles"("commande_id");

-- CreateIndex
CREATE INDEX "commande_articles_variation_id_idx" ON "commande_articles"("variation_id");

-- CreateIndex
CREATE UNIQUE INDEX "commandes_paiement_id_key" ON "commandes"("paiement_id");

-- CreateIndex
CREATE INDEX "commandes_user_id_idx" ON "commandes"("user_id");

-- CreateIndex
CREATE INDEX "commandes_vendeur_id_idx" ON "commandes"("vendeur_id");

-- CreateIndex
CREATE INDEX "commandes_statut_idx" ON "commandes"("statut");

-- CreateIndex
CREATE INDEX "commandes_created_at_idx" ON "commandes"("created_at");

-- CreateIndex
CREATE INDEX "image_articles_article_id_idx" ON "image_articles"("article_id");

-- CreateIndex
CREATE INDEX "image_articles_variation_id_idx" ON "image_articles"("variation_id");

-- CreateIndex
CREATE INDEX "livraisons_commande_id_idx" ON "livraisons"("commande_id");

-- CreateIndex
CREATE INDEX "livraisons_user_id_idx" ON "livraisons"("user_id");

-- CreateIndex
CREATE INDEX "livraisons_livreur_id_idx" ON "livraisons"("livreur_id");

-- CreateIndex
CREATE INDEX "livraisons_statut_idx" ON "livraisons"("statut");

-- CreateIndex
CREATE INDEX "reclamations_commande_id_idx" ON "reclamations"("commande_id");

-- CreateIndex
CREATE INDEX "reclamations_user_id_idx" ON "reclamations"("user_id");

-- CreateIndex
CREATE INDEX "reclamations_statut_idx" ON "reclamations"("statut");

-- CreateIndex
CREATE INDEX "stocks_variation_id_idx" ON "stocks"("variation_id");

-- CreateIndex
CREATE INDEX "stocks_quantite_idx" ON "stocks"("quantite");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_id_key" ON "users"("auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "variations_article_id_idx" ON "variations"("article_id");

-- CreateIndex
CREATE INDEX "favoris_user_id_idx" ON "favoris"("user_id");

-- CreateIndex
CREATE INDEX "favoris_article_id_idx" ON "favoris"("article_id");

-- CreateIndex
CREATE UNIQUE INDEX "favoris_user_id_article_id_key" ON "favoris"("user_id", "article_id");

-- CreateIndex
CREATE INDEX "avis_user_id_idx" ON "avis"("user_id");

-- CreateIndex
CREATE INDEX "avis_article_id_idx" ON "avis"("article_id");

-- CreateIndex
CREATE INDEX "avis_note_idx" ON "avis"("note");

-- CreateIndex
CREATE UNIQUE INDEX "avis_user_id_article_id_key" ON "avis"("user_id", "article_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_nom_key" ON "categories"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_is_active_idx" ON "categories"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "paiements_reference_key" ON "paiements"("reference");

-- CreateIndex
CREATE INDEX "paiements_user_id_idx" ON "paiements"("user_id");

-- CreateIndex
CREATE INDEX "paiements_reference_idx" ON "paiements"("reference");

-- CreateIndex
CREATE INDEX "paiements_statut_idx" ON "paiements"("statut");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "conversations_sender_id_idx" ON "conversations"("sender_id");

-- CreateIndex
CREATE INDEX "conversations_receiver_id_idx" ON "conversations"("receiver_id");

-- CreateIndex
CREATE INDEX "conversations_is_read_idx" ON "conversations"("is_read");

-- CreateIndex
CREATE INDEX "conversations_created_at_idx" ON "conversations"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "paniers_user_id_key" ON "paniers"("user_id");

-- CreateIndex
CREATE INDEX "paniers_user_id_idx" ON "paniers"("user_id");

-- CreateIndex
CREATE INDEX "panier_items_panier_id_idx" ON "panier_items"("panier_id");

-- CreateIndex
CREATE INDEX "panier_items_article_id_idx" ON "panier_items"("article_id");

-- CreateIndex
CREATE INDEX "panier_items_variation_id_idx" ON "panier_items"("variation_id");

-- CreateIndex
CREATE UNIQUE INDEX "panier_items_panier_id_article_id_variation_id_key" ON "panier_items"("panier_id", "article_id", "variation_id");

-- AddForeignKey
ALTER TABLE "article_commandes" ADD CONSTRAINT "article_commandes_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_commandes" ADD CONSTRAINT "article_commandes_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "commandes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_articles" ADD CONSTRAINT "commande_articles_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_articles" ADD CONSTRAINT "commande_articles_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "commandes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_articles" ADD CONSTRAINT "commande_articles_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "variations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_paiement_id_fkey" FOREIGN KEY ("paiement_id") REFERENCES "paiements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "variations" ADD CONSTRAINT "variations_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoris" ADD CONSTRAINT "favoris_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoris" ADD CONSTRAINT "favoris_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avis" ADD CONSTRAINT "avis_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avis" ADD CONSTRAINT "avis_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paniers" ADD CONSTRAINT "paniers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panier_items" ADD CONSTRAINT "panier_items_panier_id_fkey" FOREIGN KEY ("panier_id") REFERENCES "paniers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panier_items" ADD CONSTRAINT "panier_items_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panier_items" ADD CONSTRAINT "panier_items_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "variations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
