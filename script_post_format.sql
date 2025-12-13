-- ========================================
-- 0️⃣ Extensions nécessaires
-- ========================================
-- Extension pour générer des UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- Extension pour générer des UUID via pgcrypto
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ========================================
-- 1️⃣ Droits sur le schema public
-- ========================================
-- Permet au rôle service_role et au rôle anon d'utiliser le schema
-- Le service_role peut également créer de nouveaux objets
GRANT USAGE,
    CREATE ON SCHEMA public TO service_role;

GRANT USAGE ON SCHEMA public TO anon;


-- ========================================
-- 2️⃣ Droits sur toutes les tables existantes
-- ========================================
-- Permet au service_role et à l’anon de lire, insérer, mettre à jour et supprimer
GRANT SELECT,
    INSERT,
    UPDATE,
    DELETE ON ALL TABLES IN SCHEMA public TO service_role;


GRANT SELECT,
    INSERT,
    UPDATE,
    DELETE ON ALL TABLES IN SCHEMA public TO anon;



-- ========================================
-- 3️⃣ Droits sur toutes les séquences existantes
-- ========================================
-- Permet au service_role de gérer les séquences (utile pour les IDs auto-incrémentés)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE,
    SELECT,
    UPDATE ON SEQUENCES TO service_role;


-- ========================================
-- 4️⃣ Droits par défaut pour les futurs objets
-- ========================================
-- Assure que toutes les nouvelles tables héritent des droits sur les tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT,
    INSERT,
    UPDATE,
    DELETE ON TABLES TO service_role;


-- ========================================
-- 5️⃣ Ajustement des colonnes id par défaut
-- ========================================
-- Utilisation d’UUID pour la table users
ALTER TABLE public.users
ALTER COLUMN id
SET DEFAULT uuid_generate_v4();


-- Utilisation d’UUID pour la table publicites
ALTER TABLE public.publicites
ALTER COLUMN id
SET DEFAULT gen_random_uuid();


-- Utilisation d’UUID pour la table articles
ALTER TABLE public.articles
ALTER COLUMN id
SET DEFAULT uuid_generate_v4();


-- Utilisation d’UUID pour la table commandes
ALTER TABLE public.commandes
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Utilisation d’UUID pour la table commandes-articles
ALTER TABLE public.commande_articles
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Utilisation d’UUID pour la table variations
ALTER TABLE public.variations
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Utilisation d’UUID pour la table stocks
ALTER TABLE public.stocks
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Utilisation d’UUID pour la table avis
ALTER TABLE public.avis
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ========================================
-- 6️⃣ Droits spécifiques sur certaines tables  (!!!!!!!!! A TESTER !!!!!!!!)
-- ========================================
-- Assure que le service_role peut gérer les publicités
GRANT SELECT,
    INSERT,
    UPDATE,
    DELETE ON TABLE public.publicites TO service_role;


GRANT SELECT,
    INSERT,
    UPDATE,
    DELETE ON TABLE public.publicites TO anon;
-- seulement si nécessaire