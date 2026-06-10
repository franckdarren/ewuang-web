-- CreateTable
CREATE TABLE "zones_livraison" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ville" VARCHAR(100) NOT NULL,
    "tarif" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zones_livraison_pkey" PRIMARY KEY ("id")
);

-- Unicité de la ville insensible à la casse
CREATE UNIQUE INDEX "zones_livraison_ville_lower_key" ON "zones_livraison" (LOWER("ville"));

-- Une seule zone par défaut active à la fois
CREATE UNIQUE INDEX "zones_livraison_one_default" ON "zones_livraison" ("is_default") WHERE "is_default" = true;

-- Index pour le filtrage actif
CREATE INDEX "zones_livraison_is_active_idx" ON "zones_livraison" ("is_active");

-- Seed initial : zones existantes en dur dans paiements/initiate + zone par défaut
INSERT INTO "zones_livraison" ("ville", "tarif", "is_active", "is_default") VALUES
    ('Libreville', 2500, true, false),
    ('Akanda', 2000, true, false),
    ('Owendo', 3000, true, false),
    ('Autres villes', 3000, true, true);
