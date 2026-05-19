-- CreateEnum
CREATE TYPE "publicite_position" AS ENUM (
  'banniere_accueil',
  'banniere_categorie',
  'banniere_boutique'
);

-- CreateEnum
CREATE TYPE "publicite_premium_statut" AS ENUM (
  'en_attente',
  'approuve',
  'refuse',
  'annule'
);

-- CreateTable
CREATE TABLE "publicites_premium" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "boutique_id"  UUID NOT NULL,
  "position"     "publicite_position" NOT NULL,
  "categorie_id" UUID,
  "titre"        VARCHAR(255) NOT NULL,
  "url_image"    VARCHAR(500) NOT NULL,
  "lien"         VARCHAR(500),
  "description"  TEXT,
  "date_start"   TIMESTAMP(3) NOT NULL,
  "date_end"     TIMESTAMP(3) NOT NULL,
  "statut"       "publicite_premium_statut" NOT NULL DEFAULT 'en_attente',
  "prix"         INTEGER,
  "notes_admin"  TEXT,
  "approuve_par" UUID,
  "approuve_le"  TIMESTAMP(3),
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "publicites_premium_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "publicites_premium_boutique_fkey"
    FOREIGN KEY ("boutique_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "publicites_premium_categorie_fkey"
    FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE SET NULL,
  CONSTRAINT "publicites_premium_approuve_par_fkey"
    FOREIGN KEY ("approuve_par") REFERENCES "users"("id") ON DELETE SET NULL
);

-- CreateIndex
CREATE INDEX "publicites_premium_boutique_id_idx" ON "publicites_premium"("boutique_id");
CREATE INDEX "publicites_premium_position_idx" ON "publicites_premium"("position");
CREATE INDEX "publicites_premium_statut_idx" ON "publicites_premium"("statut");
CREATE INDEX "publicites_premium_date_start_idx" ON "publicites_premium"("date_start");
CREATE INDEX "publicites_premium_date_end_idx" ON "publicites_premium"("date_end");
