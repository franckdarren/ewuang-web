-- Migration : ajout du nom du propriétaire / gérant pour les comptes Boutique
-- À exécuter une seule fois dans l'éditeur SQL Supabase

ALTER TABLE users
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255) DEFAULT NULL;

COMMENT ON COLUMN users.owner_name
  IS 'Nom de la personne physique (propriétaire ou gérant) derrière un compte Boutique. NULL pour les autres rôles.';
