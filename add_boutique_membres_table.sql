-- Migration : table boutique_membres pour le multi-profil par boutique (Phase 2)
-- À exécuter dans l'éditeur SQL Supabase
--
-- Concept : une Boutique peut avoir 1 propriétaire (proprio) + jusqu'à 5 gérants
-- qui partagent l'accès aux articles, commandes, stocks, etc. de cette boutique.
-- Chaque membre est un compte `users` à part entière (role = 'Boutique') ; la
-- table boutique_membres lie ces comptes à la ligne « principale » qui porte
-- l'identité commerciale (nom, logo, address, heures, description).

-- 1️⃣ Enums
DO $$ BEGIN
  CREATE TYPE boutique_membre_role AS ENUM ('proprio', 'gerant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE boutique_membre_statut AS ENUM ('pending', 'active', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2️⃣ Table
CREATE TABLE IF NOT EXISTS boutique_membres (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- boutique_id = users.id du compte « principal » (le proprio).
  -- Toutes les ressources (articles, commandes, codes_promo…) restent attachées
  -- à ce user_id : pas de migration nécessaire côté tables existantes.
  boutique_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- user_id = compte public.users du membre (NULL tant qu'un invité n'a pas
  -- finalisé son inscription). Rempli au moment du join().
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  -- auth_user_id = id dans auth.users, pré-créé par inviteUserByEmail.
  -- Permet de récupérer le compte Supabase Auth au moment du join() pour y
  -- fixer le mot de passe choisi par l'invité (updateUserById).
  -- Pas de FK car auth.users n'est pas dans le schéma public.
  auth_user_id  UUID,
  -- Email cible de l'invitation (sert d'identifiant avant que user_id existe,
  -- et de garde anti-doublon : un seul invite en cours par email par boutique).
  email         VARCHAR(255) NOT NULL,
  role_membre   boutique_membre_role   NOT NULL DEFAULT 'gerant',
  statut        boutique_membre_statut NOT NULL DEFAULT 'pending',
  -- Token d'invitation (hex, 64 chars). NULL une fois l'invitation acceptée.
  invite_token  VARCHAR(64),
  expires_at    TIMESTAMPTZ,
  invited_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  invited_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at     TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3️⃣ Contraintes & index
-- Anti-doublon : un seul membership actif/pending par (boutique, email).
-- Les lignes révoquées sont exclues pour permettre la ré-invitation.
CREATE UNIQUE INDEX IF NOT EXISTS boutique_membres_active_email_idx
  ON boutique_membres (boutique_id, lower(email))
  WHERE statut IN ('pending', 'active');

-- Garantit qu'un même user ne peut pas être actif dans 2 boutiques en même temps.
CREATE UNIQUE INDEX IF NOT EXISTS boutique_membres_active_user_idx
  ON boutique_membres (user_id)
  WHERE statut = 'active' AND user_id IS NOT NULL;

-- Index lookups
CREATE INDEX IF NOT EXISTS boutique_membres_boutique_id_idx ON boutique_membres (boutique_id);
CREATE INDEX IF NOT EXISTS boutique_membres_user_id_idx     ON boutique_membres (user_id);
CREATE INDEX IF NOT EXISTS boutique_membres_invite_token_idx ON boutique_membres (invite_token);
CREATE INDEX IF NOT EXISTS boutique_membres_statut_idx       ON boutique_membres (statut);

-- 4️⃣ Trigger updated_at
CREATE OR REPLACE FUNCTION set_boutique_membres_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_boutique_membres_updated_at ON boutique_membres;
CREATE TRIGGER trg_boutique_membres_updated_at
  BEFORE UPDATE ON boutique_membres
  FOR EACH ROW EXECUTE FUNCTION set_boutique_membres_updated_at();

-- 5️⃣ Backfill : toute Boutique existante devient automatiquement son propre
-- proprio actif. Idempotent (ON CONFLICT DO NOTHING grâce à l'index unique).
INSERT INTO boutique_membres (boutique_id, user_id, email, role_membre, statut, invited_by, invited_at, joined_at)
SELECT id, id, email, 'proprio', 'active', id, created_at, created_at
FROM users
WHERE role = 'Boutique'
ON CONFLICT DO NOTHING;

-- 6️⃣ RLS — accès via service_role uniquement (les API Next.js utilisent supabaseAdmin).
-- Les utilisateurs finaux n'accèdent jamais directement à cette table depuis le client.
ALTER TABLE boutique_membres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "boutique_membres_service_role_all" ON boutique_membres;
CREATE POLICY "boutique_membres_service_role_all"
  ON boutique_membres
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE boutique_membres IS
  'Multi-profil par boutique : lie plusieurs comptes users (1 proprio + N gérants) à une même boutique. Accès géré exclusivement via les API serveur (service_role).';
