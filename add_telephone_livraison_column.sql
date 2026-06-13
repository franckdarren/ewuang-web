-- Migration : ajout du numéro de contact de livraison sur la table commandes
-- À exécuter une seule fois dans l'éditeur SQL Supabase

ALTER TABLE commandes
ADD COLUMN IF NOT EXISTS telephone_livraison VARCHAR(255) DEFAULT NULL;

COMMENT ON COLUMN commandes.telephone_livraison
  IS 'Numéro de téléphone de contact pour la livraison (distinct du numéro de paiement mobile money)';
