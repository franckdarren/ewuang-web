-- Migration : table device_tokens (push FCM multi-appareils)
-- À exécuter une seule fois dans l'éditeur SQL Supabase.
--
-- Contexte : jusqu'ici un seul token push était stocké par utilisateur
-- (users.fcm_token). Un même compte connecté sur plusieurs appareils ne
-- recevait donc le push que sur le dernier enregistré. Cette table associe
-- 1..N tokens à un user. Le helper backend `envoyerPushFCM` lit device_tokens
-- (multi-device) en plus du repli legacy users.fcm_token, et purge ici les
-- tokens rejetés par FCM (appareils désinstallés / tokens expirés).

-- 1️⃣ Table
CREATE TABLE IF NOT EXISTS device_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  -- Plateforme indicative (android | ios | web), pour le diagnostic.
  platform    VARCHAR(16),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2️⃣ Contraintes & index
-- Un token FCM est unique au niveau de l'appareil : s'il « migre » vers un
-- autre compte (déconnexion/reconnexion sur le même téléphone), on réattribue
-- la ligne au nouveau user via UPSERT (ON CONFLICT (token)).
CREATE UNIQUE INDEX IF NOT EXISTS device_tokens_token_idx ON device_tokens (token);
CREATE INDEX IF NOT EXISTS device_tokens_user_id_idx ON device_tokens (user_id);

-- 3️⃣ Trigger updated_at
CREATE OR REPLACE FUNCTION set_device_tokens_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_device_tokens_updated_at ON device_tokens;
CREATE TRIGGER trg_device_tokens_updated_at
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW EXECUTE FUNCTION set_device_tokens_updated_at();

-- 4️⃣ Backfill : migre les tokens legacy déjà connus vers la nouvelle table.
-- Idempotent grâce à l'index unique sur token.
INSERT INTO device_tokens (user_id, token)
SELECT id, fcm_token
FROM users
WHERE fcm_token IS NOT NULL
ON CONFLICT (token) DO NOTHING;

-- 5️⃣ RLS — accès via service_role uniquement (les API Next.js utilisent supabaseAdmin).
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "device_tokens_service_role_all" ON device_tokens;
CREATE POLICY "device_tokens_service_role_all"
  ON device_tokens
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE device_tokens IS
  'Tokens push FCM par appareil (1..N par user). Lu/écrit exclusivement via les API serveur (service_role). Repli legacy : users.fcm_token.';
