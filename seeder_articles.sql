-- ============================================
-- SCRIPT D'INSERTION DE 50 ARTICLES TESTS
-- Boutique: IFA (boutique@example.com)
-- ============================================

-- Récupération de l'ID de la boutique IFA
DO $$
DECLARE
    v_user_id UUID;
    v_article_id UUID;
    v_variation_id UUID;
BEGIN
    -- Récupérer l'ID de la boutique IFA
    SELECT id INTO v_user_id FROM users WHERE email = 'boutique@example.com' LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Boutique IFA non trouvée. Veuillez d''abord créer un utilisateur avec l''email boutique@example.com';
    END IF;

    -- ============================================
    -- CATÉGORIE: ÉLECTRONIQUE - Téléphones & Tablettes
    -- ============================================
    
    -- Article 1: iPhone 15 Pro Max
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
    VALUES (v_article_id, 'iPhone 15 Pro Max 256GB', 'Le tout nouveau iPhone 15 Pro Max avec Dynamic Island, puce A17 Pro et appareil photo 48MP', 1299000, 1199000, true, 8, false, v_user_id, '6eb799aa-1c77-40e2-b242-5ad2f1fc6eca', 'https://images.unsplash.com/photo-1696446702183-cbd80a1c2e0d?w=500', true, NOW(), NOW());
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image) VALUES
    (gen_random_uuid(), v_article_id, 'Titane Naturel', NULL, 15, 1299000, 'https://images.unsplash.com/photo-1696446702183-cbd80a1c2e0d?w=300'),
    (gen_random_uuid(), v_article_id, 'Titane Bleu', NULL, 12, 1299000, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300'),
    (gen_random_uuid(), v_article_id, 'Titane Noir', NULL, 20, 1299000, 'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?w=300');
    
    INSERT INTO image_articles (id, url_photo, article_id) VALUES
    (gen_random_uuid(), 'https://images.unsplash.com/photo-1696446702183-cbd80a1c2e0d?w=800', v_article_id),
    (gen_random_uuid(), 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800', v_article_id);

    -- Article 2: Samsung Galaxy S24 Ultra
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'Samsung Galaxy S24 Ultra 512GB', 'Smartphone premium avec S Pen intégré, écran Dynamic AMOLED 2X et zoom 100x', 1450000, NULL, false, 0, false, v_user_id, '6eb799aa-1c77-40e2-b242-5ad2f1fc6eca', 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Noir Titane', NULL, 18, NULL),
    (gen_random_uuid(), v_article_id, 'Gris Titane', NULL, 15, NULL),
    (gen_random_uuid(), v_article_id, 'Violet', NULL, 10, NULL);

    -- Article 3: MacBook Pro M3
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'MacBook Pro 14" M3 Pro', 'Ordinateur portable avec puce M3 Pro, écran Liquid Retina XDR et autonomie 18h', 2800000, 2650000, true, 5, false, v_user_id, 'b805bad9-fb65-46fb-860f-2f2df3ee8e55', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Gris Sidéral', NULL, 8, NULL),
    (gen_random_uuid(), v_article_id, 'Argent', NULL, 10, NULL);

    -- Article 4: iPad Air
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'iPad Air 11" M2 128GB', 'Tablette ultra-légère avec puce M2 et écran Liquid Retina', 850000, NULL, false, 0, false, v_user_id, '6eb799aa-1c77-40e2-b242-5ad2f1fc6eca', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Bleu', NULL, 25, NULL),
    (gen_random_uuid(), v_article_id, 'Gris Sidéral', NULL, 30, NULL),
    (gen_random_uuid(), v_article_id, 'Lumière Stellaire', NULL, 20, NULL);

    -- Article 5: AirPods Pro
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'AirPods Pro 2ème génération', 'Écouteurs avec réduction active du bruit et audio spatial personnalisé', 340000, 299000, true, 12, false, v_user_id, 'b805bad9-fb65-46fb-860f-2f2df3ee8e55', 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Blanc', NULL, 50, NULL);

    -- Article 6: Dell XPS 15
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'Dell XPS 15 i7 32GB RAM', 'PC portable haute performance avec écran OLED 4K et carte graphique NVIDIA RTX', 2400000, NULL, false, 0, false, v_user_id, 'b805bad9-fb65-46fb-860f-2f2df3ee8e55', 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Argent', NULL, 5, NULL),
    (gen_random_uuid(), v_article_id, 'Noir', NULL, 7, NULL);

    -- Article 7: Samsung Galaxy Tab S9
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'Samsung Galaxy Tab S9 11" 256GB', 'Tablette Android premium avec S Pen inclus et résistance à l''eau IP68', 780000, 699000, true, 10, false, v_user_id, '6eb799aa-1c77-40e2-b242-5ad2f1fc6eca', 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Graphite', NULL, 15, NULL),
    (gen_random_uuid(), v_article_id, 'Beige', NULL, 12, NULL);

    -- Article 8: Sony WH-1000XM5
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'Sony WH-1000XM5 Casque Bluetooth', 'Casque sans fil haut de gamme avec réduction de bruit de pointe', 420000, NULL, false, 0, false, v_user_id, 'b805bad9-fb65-46fb-860f-2f2df3ee8e55', 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Noir', NULL, 30, NULL),
    (gen_random_uuid(), v_article_id, 'Argent', NULL, 25, NULL);

    -- Article 9: Google Pixel 8 Pro
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'Google Pixel 8 Pro 256GB', 'Smartphone Android pur avec IA Google et appareil photo exceptionnel', 1050000, 945000, true, 10, false, v_user_id, '6eb799aa-1c77-40e2-b242-5ad2f1fc6eca', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Obsidienne', NULL, 14, NULL),
    (gen_random_uuid(), v_article_id, 'Porcelaine', NULL, 10, NULL),
    (gen_random_uuid(), v_article_id, 'Bleu Ciel', NULL, 12, NULL);

    -- Article 10: Logitech MX Master 3S
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'Logitech MX Master 3S Souris Sans Fil', 'Souris ergonomique professionnelle avec 8000 DPI et défilement silencieux', 125000, NULL, false, 0, false, v_user_id, 'b805bad9-fb65-46fb-860f-2f2df3ee8e55', 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Noir', NULL, 40, NULL),
    (gen_random_uuid(), v_article_id, 'Gris Pâle', NULL, 35, NULL);

    -- ============================================
    -- CATÉGORIE: MODE
    -- ============================================

    -- Article 11: Chemise en pagne gabonais
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'Chemise Homme Pagne Gabonais', 'Chemise élégante confectionnée en pagne traditionnel gabonais, coupe moderne', 45000, NULL, false, 0, true, v_user_id, '3e0aadcc-7596-4fdb-af13-7675158ef17a', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Multicolore', 'S', 8, NULL),
    (gen_random_uuid(), v_article_id, 'Multicolore', 'M', 15, NULL),
    (gen_random_uuid(), v_article_id, 'Multicolore', 'L', 20, NULL),
    (gen_random_uuid(), v_article_id, 'Multicolore', 'XL', 12, NULL);

    -- Article 12: Robe africaine
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'Robe Longue Wax Africain', 'Magnifique robe longue en tissu wax avec motifs africains authentiques', 65000, 55000, true, 15, true, v_user_id, '3e0aadcc-7596-4fdb-af13-7675158ef17a', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Bleu/Orange', 'S', 10, NULL),
    (gen_random_uuid(), v_article_id, 'Bleu/Orange', 'M', 18, NULL),
    (gen_random_uuid(), v_article_id, 'Bleu/Orange', 'L', 15, NULL),
    (gen_random_uuid(), v_article_id, 'Rouge/Jaune', 'M', 12, NULL),
    (gen_random_uuid(), v_article_id, 'Rouge/Jaune', 'L', 10, NULL);

    -- Article 13: Baskets Nike Air Max
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'Nike Air Max 90 Baskets', 'Baskets iconiques Nike avec amorti Air visible et design intemporel', 180000, NULL, false, 0, false, v_user_id, '3e0aadcc-7596-4fdb-af13-7675158ef17a', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Blanc/Noir', '40', 8, NULL),
    (gen_random_uuid(), v_article_id, 'Blanc/Noir', '41', 12, NULL),
    (gen_random_uuid(), v_article_id, 'Blanc/Noir', '42', 15, NULL),
    (gen_random_uuid(), v_article_id, 'Blanc/Noir', '43', 18, NULL),
    (gen_random_uuid(), v_article_id, 'Blanc/Noir', '44', 10, NULL);

    -- Article 14: Jean Levi's 501
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'Jean Levi''s 501 Original', 'Le jean iconique à coupe droite, 100% coton denim', 95000, 85500, true, 10, false, v_user_id, '3e0aadcc-7596-4fdb-af13-7675158ef17a', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Bleu Foncé', '28', 5, NULL),
    (gen_random_uuid(), v_article_id, 'Bleu Foncé', '30', 12, NULL),
    (gen_random_uuid(), v_article_id, 'Bleu Foncé', '32', 18, NULL),
    (gen_random_uuid(), v_article_id, 'Bleu Foncé', '34', 15, NULL),
    (gen_random_uuid(), v_article_id, 'Noir', '30', 10, NULL),
    (gen_random_uuid(), v_article_id, 'Noir', '32', 14, NULL);

    -- Article 15: Veste en cuir
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'Veste Cuir Véritable Homme', 'Veste en cuir véritable, style motard avec fermeture éclair', 380000, NULL, false, 0, false, v_user_id, '3e0aadcc-7596-4fdb-af13-7675158ef17a', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Noir', 'M', 6, NULL),
    (gen_random_uuid(), v_article_id, 'Noir', 'L', 8, NULL),
    (gen_random_uuid(), v_article_id, 'Noir', 'XL', 5, NULL),
    (gen_random_uuid(), v_article_id, 'Marron', 'L', 4, NULL);

    -- Article 16: T-shirt Made in Gabon
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'T-shirt Bio "Fier d''être Gabonais"', 'T-shirt en coton bio avec impression sérigraphique artisanale', 25000, 20000, true, 20, true, v_user_id, '3e0aadcc-7596-4fdb-af13-7675158ef17a', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Blanc', 'S', 20, NULL),
    (gen_random_uuid(), v_article_id, 'Blanc', 'M', 30, NULL),
    (gen_random_uuid(), v_article_id, 'Blanc', 'L', 25, NULL),
    (gen_random_uuid(), v_article_id, 'Noir', 'M', 22, NULL),
    (gen_random_uuid(), v_article_id, 'Noir', 'L', 18, NULL);

    -- Article 17: Sac à main en raphia
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'Sac à Main Raphia Artisanal', 'Sac tissé main en raphia naturel par des artisans gabonais', 58000, NULL, false, 0, true, v_user_id, '3e0aadcc-7596-4fdb-af13-7675158ef17a', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Naturel', 'Unique', 15, NULL),
    (gen_random_uuid(), v_article_id, 'Naturel/Bleu', 'Unique', 12, NULL),
    (gen_random_uuid(), v_article_id, 'Naturel/Rouge', 'Unique', 10, NULL);

    -- Article 18: Chaussures de sport Adidas
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'Adidas Ultraboost 23 Running', 'Chaussures de course premium avec technologie Boost', 220000, 198000, true, 10, false, v_user_id, '3e0aadcc-7596-4fdb-af13-7675158ef17a', 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Noir/Blanc', '40', 10, NULL),
    (gen_random_uuid(), v_article_id, 'Noir/Blanc', '41', 15, NULL),
    (gen_random_uuid(), v_article_id, 'Noir/Blanc', '42', 18, NULL),
    (gen_random_uuid(), v_article_id, 'Noir/Blanc', '43', 12, NULL);

    -- Article 19: Robe de soirée
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'Robe de Soirée Élégante', 'Robe longue en satin avec détails brodés, parfaite pour les occasions spéciales', 145000, NULL, false, 0, false, v_user_id, '3e0aadcc-7596-4fdb-af13-7675158ef17a', 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Noir', 'S', 5, NULL),
    (gen_random_uuid(), v_article_id, 'Noir', 'M', 8, NULL),
    (gen_random_uuid(), v_article_id, 'Rouge', 'S', 4, NULL),
    (gen_random_uuid(), v_article_id, 'Rouge', 'M', 6, NULL);

    -- Article 20: Montre connectée
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'Montre Connectée Sport Elite', 'Montre intelligente avec suivi santé, GPS et notifications', 85000, 72250, true, 15, false, v_user_id, '3e0aadcc-7596-4fdb-af13-7675158ef17a', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Noir', 'Unique', 25, NULL),
    (gen_random_uuid(), v_article_id, 'Argent', 'Unique', 20, NULL),
    (gen_random_uuid(), v_article_id, 'Or Rose', 'Unique', 15, NULL);

    -- ============================================
    -- CATÉGORIE: MAISON & CUISINE
    -- ============================================

    -- Article 21: Blender multifonction
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'Blender Professionnel 2000W', 'Blender haute puissance avec 5 vitesses et fonction glace pilée', 125000, NULL, false, 0, false, v_user_id, '82da5552-8280-45b4-a427-33ba2d20a3b1', 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Noir', NULL, 30, NULL),
    (gen_random_uuid(), v_article_id, 'Rouge', NULL, 25, NULL),
    (gen_random_uuid(), v_article_id, 'Argent', NULL, 20, NULL);

    -- Article 22: Canapé 3 places
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'Canapé 3 Places Tissu Confort', 'Canapé moderne en tissu avec coussins moelleux et pieds en bois', 450000, 405000, true, 10, false, v_user_id, '82da5552-8280-45b4-a427-33ba2d20a3b1', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Gris Clair', NULL, 5, NULL),
    (gen_random_uuid(), v_article_id, 'Bleu Marine', NULL, 4, NULL),
    (gen_random_uuid(), v_article_id, 'Beige', NULL, 6, NULL);

    -- Article 23: Batterie de cuisine
    v_article_id := gen_random_uuid();
    INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active)
    VALUES (v_article_id, 'Set Casseroles Inox 12 Pièces', 'Batterie de cuisine professionnelle en inox avec revêtement antiadhésif', 185000, NULL, false, 0, false, v_user_id, '82da5552-8280-45b4-a427-33ba2d20a3b1', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=500', true);
    
    INSERT INTO variations (id, article_id, couleur, taille, stock, prix) VALUES
    (gen_random_uuid(), v_article_id, 'Argent', NULL, 18, NULL);


END;
$$;