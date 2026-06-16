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
--    Marque les commandes comme expirées et libère le stock.
--    Retourne le nombre de commandes expirées.
CREATE OR REPLACE FUNCTION expirer_commandes_en_attente_validation()
RETURNS INTEGER AS $$
DECLARE
  cmd RECORD;
  total INTEGER := 0;
BEGIN
  FOR cmd IN
    SELECT id
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

    total := total + 1;
  END LOOP;

  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
