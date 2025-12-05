-- Fonctions RPC Supabase à créer dans votre base de données
-- Ces fonctions sont nécessaires pour les opérations de mise à jour des stocks et soldes

-- 1. Fonction pour décrémenter le stock d'une variation
CREATE OR REPLACE FUNCTION decrement_variation_stock(
  variation_id UUID,
  quantity INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE variations
  SET stock = stock - quantity,
      updated_at = NOW()
  WHERE id = variation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variation non trouvée: %', variation_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fonction pour incrémenter le stock d'une variation (pour les annulations)
CREATE OR REPLACE FUNCTION increment_variation_stock(
  variation_id UUID,
  quantity INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE variations
  SET stock = stock + quantity,
      updated_at = NOW()
  WHERE id = variation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variation non trouvée: %', variation_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fonction pour incrémenter le solde d'un utilisateur
CREATE OR REPLACE FUNCTION increment_user_solde(
  user_id UUID,
  amount INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET solde = solde + amount,
      updated_at = NOW()
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur non trouvé: %', user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fonction pour décrémenter le solde d'un utilisateur (pour les remboursements)
CREATE OR REPLACE FUNCTION decrement_user_solde(
  user_id UUID,
  amount INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET solde = solde - amount,
      updated_at = NOW()
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur non trouvé: %', user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fonction pour vérifier la disponibilité du stock
CREATE OR REPLACE FUNCTION check_variation_stock(
  variation_id UUID,
  required_quantity INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  SELECT stock INTO current_stock
  FROM variations
  WHERE id = variation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variation non trouvée: %', variation_id;
  END IF;
  
  RETURN current_stock >= required_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Fonction pour obtenir le prix effectif d'un article (avec ou sans promotion)
CREATE OR REPLACE FUNCTION get_article_price(
  article_id UUID,
  variation_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  article_prix INTEGER;
  article_prix_promo INTEGER;
  article_is_promo BOOLEAN;
  variation_prix INTEGER;
BEGIN
  -- Récupérer les infos de l'article
  SELECT prix, prix_promotion, is_promotion
  INTO article_prix, article_prix_promo, article_is_promo
  FROM articles
  WHERE id = article_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Article non trouvé: %', article_id;
  END IF;
  
  -- Si une variation est spécifiée, récupérer son prix
  IF variation_id IS NOT NULL THEN
    SELECT prix INTO variation_prix
    FROM variations
    WHERE id = variation_id AND article_id = article_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variation non trouvée: %', variation_id;
    END IF;
    
    -- Si l'article est en promotion, retourner le prix promo
    IF article_is_promo THEN
      RETURN article_prix_promo;
    END IF;
    
    -- Sinon, retourner le prix de la variation si défini, sinon le prix de l'article
    IF variation_prix IS NOT NULL AND variation_prix > 0 THEN
      RETURN variation_prix;
    ELSE
      RETURN article_prix;
    END IF;
  ELSE
    -- Pas de variation, retourner le prix ou prix promo
    IF article_is_promo THEN
      RETURN article_prix_promo;
    ELSE
      RETURN article_prix;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Pour utiliser ces fonctions, exécutez ce script SQL dans votre base Supabase
-- via le SQL Editor ou via les migrations Prisma