-- =====================================================================
-- Fonctionnalité : Création de commande par la boutique pour un client
-- =====================================================================
-- Permet à un propriétaire/gérant de boutique de composer une commande
-- au nom d'un client. Le client doit valider et payer via PVIT pour que
-- la commande passe en flux normal. Le stock est réservé dès la création.
-- Expiration automatique au bout de 48h si pas de réponse.
-- =====================================================================

-- 1. Ajouter les nouveaux statuts à l'enum commandes_statut
--    Postgres exige que les ALTER TYPE ADD VALUE soient hors transaction,
--    donc à exécuter UN PAR UN dans Supabase SQL Editor si nécessaire.
ALTER TYPE commandes_statut ADD VALUE IF NOT EXISTS 'En attente de validation client';
ALTER TYPE commandes_statut ADD VALUE IF NOT EXISTS 'Refusée par le client';
ALTER TYPE commandes_statut ADD VALUE IF NOT EXISTS 'Expirée non validée';

-- 2. Ajouter les champs sur la table commandes pour tracer le créateur
ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS creee_par_boutique_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS adresse_a_confirmer BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS expire_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_commandes_creee_par_boutique
  ON commandes(creee_par_boutique_id);

CREATE INDEX IF NOT EXISTS idx_commandes_expire_at
  ON commandes(expire_at)
  WHERE expire_at IS NOT NULL;

-- 3. Fonction qui libère le stock d'une commande (utilisée pour refus / expiration)
CREATE OR REPLACE FUNCTION liberer_stock_commande(
  p_commande_id UUID
)
RETURNS VOID AS $$
DECLARE
  ca RECORD;
BEGIN
  FOR ca IN
    SELECT article_id, variation_id, quantite
    FROM commande_articles
    WHERE commande_id = p_commande_id
  LOOP
    IF ca.variation_id IS NOT NULL THEN
      UPDATE variations
      SET stock = stock + ca.quantite,
          updated_at = NOW()
      WHERE id = ca.variation_id;
    ELSE
      UPDATE articles
      SET stock = stock + ca.quantite,
          updated_at = NOW()
      WHERE id = ca.article_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fonction d'expiration des commandes en attente de validation > 48h
--    Marque les commandes comme expirées, libère le stock, et envoie une
--    notification au client + à la boutique. Retourne (expirees, rappels)
--    pour traçabilité / logs.
--
--    Étape A : rappel J-1 (commandes qui expirent dans 23h-24h)
--    Étape B : expiration + libération stock + notifications finales
CREATE OR REPLACE FUNCTION expirer_commandes_en_attente_validation()
RETURNS TABLE(expirees INTEGER, rappels INTEGER) AS $$
DECLARE
  cmd RECORD;
  v_expirees INTEGER := 0;
  v_rappels  INTEGER := 0;
BEGIN
  -- Étape A : rappels J-1 (entre 23h et 24h avant expiration)
  FOR cmd IN
    SELECT id, numero, user_id
    FROM commandes
    WHERE statut = 'En attente de validation client'
      AND expire_at IS NOT NULL
      AND expire_at BETWEEN NOW() + INTERVAL '23 hours'
                       AND NOW() + INTERVAL '24 hours'
  LOOP
    INSERT INTO notifications (user_id, type, titre, message, lien, is_read, created_at)
    VALUES (
      cmd.user_id,
      'commande',
      'Commande en attente',
      'La commande ' || cmd.numero || ' expire dans moins de 24h. Validez-la pour la payer.',
      '/commandes/' || cmd.id || '/valider',
      FALSE,
      NOW()
    );
    v_rappels := v_rappels + 1;
  END LOOP;

  -- Étape B : expiration + libération stock + notifications
  FOR cmd IN
    SELECT id, numero, user_id, creee_par_boutique_id
    FROM commandes
    WHERE statut = 'En attente de validation client'
      AND expire_at IS NOT NULL
      AND expire_at < NOW()
  LOOP
    PERFORM liberer_stock_commande(cmd.id);

    UPDATE commandes
    SET statut = 'Expirée non validée',
        updated_at = NOW()
    WHERE id = cmd.id;

    -- Notification client
    INSERT INTO notifications (user_id, type, titre, message, lien, is_read, created_at)
    VALUES (
      cmd.user_id,
      'commande',
      'Commande expirée',
      'La commande ' || cmd.numero || ' a expiré faute de validation.',
      '/commandes/' || cmd.id,
      FALSE,
      NOW()
    );

    -- Notification boutique
    IF cmd.creee_par_boutique_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, titre, message, lien, is_read, created_at)
      VALUES (
        cmd.creee_par_boutique_id,
        'commande',
        'Commande client expirée',
        'La commande ' || cmd.numero || ' a expiré, le stock a été restitué.',
        '/commandes/' || cmd.id,
        FALSE,
        NOW()
      );
    END IF;

    v_expirees := v_expirees + 1;
  END LOOP;

  expirees := v_expirees;
  rappels  := v_rappels;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- 5. Planification pg_cron (parade au cron Vercel limité au Hobby plan)
-- =====================================================================
-- pg_cron est disponible nativement sur Supabase. Il faut d'abord activer
-- l'extension (Dashboard → Database → Extensions → pg_cron : Enable).
-- Ensuite exécuter le bloc ci-dessous UNE FOIS pour planifier le job.
--
-- Avantages vs Vercel Cron Hobby :
--   - Granularité horaire (Vercel Hobby = daily uniquement)
--   - Gratuit, illimité
--   - Tourne dans Postgres, donc pas de timeout serverless
--
-- Pour désinscrire le job plus tard :
--   SELECT cron.unschedule('expirer-commandes-validation-client');

-- Activer l'extension si pas déjà fait (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Planifier l'exécution toutes les heures à la minute 5
-- (la minute 5 plutôt que 0 évite les pics où d'autres jobs Supabase tournent)
DO $$
BEGIN
  -- Nettoie un job existant du même nom pour rendre le script idempotent
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'expirer-commandes-validation-client';

  PERFORM cron.schedule(
    'expirer-commandes-validation-client',
    '5 * * * *',
    'SELECT expirer_commandes_en_attente_validation();'
  );
END $$;
