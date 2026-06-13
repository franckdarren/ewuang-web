-- Migration : ajout de la colonne fcm_token sur la table users
-- À exécuter une seule fois dans l'éditeur SQL Supabase

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS fcm_token TEXT DEFAULT NULL;

-- Index pour accélérer les requêtes de sélection des tokens non nuls
CREATE INDEX IF NOT EXISTS idx_users_fcm_token
ON public.users (fcm_token)
WHERE fcm_token IS NOT NULL;
