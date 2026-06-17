-- Ajoute la colonne auth_user_id manquante sur boutique_membres.
-- Sans elle, join.ts (qui la SELECT) échoue avec 42703 → "Invitation introuvable".
-- Nullable, sans FK (auth.users hors schéma public), cf. add_boutique_membres_table.sql.
ALTER TABLE public.boutique_membres
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;
