-- =====================================================================
-- Fonctionnalité : Système de remboursement avec workflow d'arbitrage
-- =====================================================================
-- Processus (machine à états) :
--   1. Le CLIENT crée une demande de remboursement avec un motif.
--        statut → "En attente réponse vendeur"
--   2. Le VENDEUR (boutique) répond :
--        - accepte                       → decision_vendeur = "Acceptée"
--        - refuse (avec motif)           → decision_vendeur = "Refusée"
--      Dans les deux cas → statut "En attente arbitrage admin"
--      (l'admin valide TOUJOURS, même si le vendeur est d'accord).
--   3. L'ADMIN prend en charge → statut "En traitement par l'admin"
--      (il signale qu'il étudie le dossier, puis revient conclure).
--   4. L'ADMIN tranche :
--        - validation → statut "Remboursée"  → déclenche le remboursement
--        - rejet      → statut "Rejetée"
--
-- Escalade automatique : si le vendeur ne répond pas sous 72h, la demande
-- passe en arbitrage admin avec decision_vendeur = "Sans réponse" (pg_cron).
--
-- Déclenchement du remboursement (étape 4 validation) : marque la commande
-- et le paiement "Remboursée", contre-passe les soldes crédités (bénéfices
-- boutiques + frais admin), notifie le client. Le transfert effectif de
-- l'argent au client est fait par l'admin (point d'extension PVIT payout
-- prêt dans app/lib/remboursement.ts).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Enum des statuts de remboursement
--    Postgres exige CREATE TYPE hors transaction si déjà existant ; ce bloc
--    est idempotent.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'remboursements_statut') THEN
    CREATE TYPE remboursements_statut AS ENUM (
      'En attente réponse vendeur',
      'En attente arbitrage admin',
      'En traitement par l''admin',
      'Remboursée',
      'Rejetée',
      'Annulée'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. Table remboursements
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS remboursements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id       UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  paiement_id       UUID REFERENCES paiements(id) ON DELETE SET NULL,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- client demandeur
  vendeur_id        UUID REFERENCES users(id) ON DELETE SET NULL,           -- boutique concernée
  montant           INTEGER NOT NULL DEFAULT 0,                             -- montant à rembourser (XAF)
  motif             TEXT NOT NULL,                                          -- motif du client
  statut            remboursements_statut NOT NULL DEFAULT 'En attente réponse vendeur',
  decision_vendeur  VARCHAR(20),                  -- 'Acceptée' | 'Refusée' | 'Sans réponse'
  motif_vendeur     TEXT,                          -- motif du refus vendeur
  traite_par        UUID REFERENCES users(id) ON DELETE SET NULL,           -- admin qui prend en charge
  conclusion_admin  TEXT,                          -- conclusion / motif de l'admin
  vendeur_deadline  TIMESTAMPTZ,                   -- délai de réponse vendeur (escalade auto)
  rembourse_le      TIMESTAMPTZ,                   -- horodatage du déclenchement effectif
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remboursements_commande ON remboursements(commande_id);
CREATE INDEX IF NOT EXISTS idx_remboursements_user     ON remboursements(user_id);
CREATE INDEX IF NOT EXISTS idx_remboursements_vendeur  ON remboursements(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_remboursements_statut   ON remboursements(statut);
CREATE INDEX IF NOT EXISTS idx_remboursements_deadline
  ON remboursements(vendeur_deadline)
  WHERE vendeur_deadline IS NOT NULL;

-- Une seule demande ACTIVE par commande (empêche les doublons).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_remboursement_actif_par_commande
  ON remboursements(commande_id)
  WHERE statut IN (
    'En attente réponse vendeur',
    'En attente arbitrage admin',
    'En traitement par l''admin'
  );

-- ---------------------------------------------------------------------
-- 3. Escalade automatique : vendeur n'a pas répondu sous délai
--    Étape A : rappel J-1 au vendeur (deadline dans 23h-24h)
--    Étape B : escalade → arbitrage admin + notifications
--    Retourne (escaladees, rappels) pour les logs.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION escalader_remboursements_sans_reponse()
RETURNS TABLE(escaladees INTEGER, rappels INTEGER) AS $$
DECLARE
  rb RECORD;
  adm RECORD;
  v_num TEXT;
  v_escaladees INTEGER := 0;
  v_rappels    INTEGER := 0;
BEGIN
  -- Étape A : rappels J-1 au vendeur
  FOR rb IN
    SELECT r.id, r.vendeur_id, c.numero
    FROM remboursements r
    JOIN commandes c ON c.id = r.commande_id
    WHERE r.statut = 'En attente réponse vendeur'
      AND r.vendeur_id IS NOT NULL
      AND r.vendeur_deadline IS NOT NULL
      AND r.vendeur_deadline BETWEEN NOW() + INTERVAL '23 hours'
                                 AND NOW() + INTERVAL '24 hours'
  LOOP
    INSERT INTO notifications (user_id, type, titre, message, lien, is_read, created_at)
    VALUES (
      rb.vendeur_id,
      'Commande',
      'Demande de remboursement en attente',
      'Une demande de remboursement sur la commande ' || rb.numero ||
        ' attend votre réponse. Sans réponse sous 24h, elle sera transmise à l''administration.',
      '/remboursements/' || rb.id,
      FALSE,
      NOW()
    );
    v_rappels := v_rappels + 1;
  END LOOP;

  -- Étape B : escalade des demandes dont le délai vendeur est dépassé
  FOR rb IN
    SELECT r.id, r.user_id, r.vendeur_id, c.numero
    FROM remboursements r
    JOIN commandes c ON c.id = r.commande_id
    WHERE r.statut = 'En attente réponse vendeur'
      AND r.vendeur_deadline IS NOT NULL
      AND r.vendeur_deadline < NOW()
  LOOP
    UPDATE remboursements
    SET statut = 'En attente arbitrage admin',
        decision_vendeur = 'Sans réponse',
        updated_at = NOW()
    WHERE id = rb.id;

    -- Notifier le client
    INSERT INTO notifications (user_id, type, titre, message, lien, is_read, created_at)
    VALUES (
      rb.user_id,
      'Commande',
      'Demande de remboursement transmise',
      'Le vendeur n''a pas répondu à temps : votre demande de remboursement sur la commande ' ||
        rb.numero || ' est transmise à l''administration.',
      '/remboursements/' || rb.id,
      FALSE,
      NOW()
    );

    -- Notifier tous les administrateurs
    FOR adm IN SELECT id FROM users WHERE role = 'Administrateur'
    LOOP
      INSERT INTO notifications (user_id, type, titre, message, lien, is_read, created_at)
      VALUES (
        adm.id,
        'Système',
        'Remboursement à arbitrer',
        'Une demande de remboursement (commande ' || rb.numero ||
          ') est en attente d''arbitrage : le vendeur n''a pas répondu.',
        '/dashboard/remboursements',
        FALSE,
        NOW()
      );
    END LOOP;

    v_escaladees := v_escaladees + 1;
  END LOOP;

  escaladees := v_escaladees;
  rappels    := v_rappels;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 4. Planification pg_cron (toutes les heures à la minute 10)
--    Activer l'extension pg_cron au préalable (Dashboard → Extensions).
--    Pour désinscrire : SELECT cron.unschedule('escalader-remboursements');
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'escalader-remboursements';

  PERFORM cron.schedule(
    'escalader-remboursements',
    '10 * * * *',
    'SELECT escalader_remboursements_sans_reponse();'
  );
END $$;
