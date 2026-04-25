-- ============================================================
-- SEEDER COMPLET - EWUANG MARKETPLACE
-- Efface toutes les données et réinsère des données de test
-- ============================================================

-- Désactiver les triggers temporairement pour les FK
SET session_replication_role = replica;

-- ============================================================
-- 1. NETTOYAGE DANS L'ORDRE (dépendances en cascade)
-- ============================================================
TRUNCATE TABLE
  panier_items,
  paniers,
  conversations,
  notifications,
  avis,
  favoris,
  reclamations,
  livraisons,
  article_commandes,
  commande_articles,
  commandes,
  paiements,
  stocks,
  image_articles,
  variations,
  articles,
  publicites,
  categories,
  users
CASCADE;

-- Réactiver les triggers
SET session_replication_role = DEFAULT;

-- ============================================================
-- 2. UTILISATEURS
-- Rôles: admin, vendeur, acheteur, livreur
-- ============================================================
INSERT INTO users (id, auth_id, name, role, email, url_logo, phone, heure_ouverture, heure_fermeture, description, address, solde, is_verified, is_active, created_at, updated_at)
VALUES
  -- Admin
  ('00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'Admin Ewuang',        'Administrateur', 'admin@ewuang.com',          'https://i.pravatar.cc/150?img=1',  '+24177000001', NULL,    NULL,    NULL,                                   'Libreville, Gabon', 0,       true,  true, NOW() - INTERVAL '90 days', NOW()),

  -- Vendeurs / Boutiques
  ('00000000-0000-0000-0000-000000000002', gen_random_uuid(), 'TechGabon Store',      'Boutique', 'techgabon@ewuang.com',       'https://i.pravatar.cc/150?img=2',  '+24177000002', '08:00', '18:00', 'Spécialiste en électronique et tech.',   'Boulevard de l''Indépendance, Libreville', 250000, true,  true, NOW() - INTERVAL '80 days', NOW()),
  ('00000000-0000-0000-0000-000000000003', gen_random_uuid(), 'Mode Gabonaise',       'Boutique', 'modegabon@ewuang.com',       'https://i.pravatar.cc/150?img=3',  '+24177000003', '09:00', '19:00', 'Vêtements et accessoires tendance.',     'Quartier Louis, Libreville',              180000, true,  true, NOW() - INTERVAL '75 days', NOW()),
  ('00000000-0000-0000-0000-000000000004', gen_random_uuid(), 'Maison & Déco Plus',   'Boutique', 'maisondeco@ewuang.com',      'https://i.pravatar.cc/150?img=4',  '+24177000004', '08:30', '17:30', 'Mobilier, décoration et électroménager.','Owendo, Libreville',                      95000,  true,  true, NOW() - INTERVAL '60 days', NOW()),
  ('00000000-0000-0000-0000-000000000005', gen_random_uuid(), 'Beauté Naturelle',     'Boutique', 'beautenaturelle@ewuang.com', 'https://i.pravatar.cc/150?img=5',  '+24177000005', '09:00', '18:00', 'Cosmétiques et soins naturels.',         'Akanda, Libreville',                      72000,  false, true, NOW() - INTERVAL '40 days', NOW()),

  -- Acheteurs
  ('00000000-0000-0000-0000-000000000006', gen_random_uuid(), 'Jean-Baptiste Mba',    'Client','jbmba@gmail.com',            'https://i.pravatar.cc/150?img=6',  '+24166000001', NULL,    NULL,    NULL,                                   'Lalala, Libreville',                      0,      true,  true, NOW() - INTERVAL '70 days', NOW()),
  ('00000000-0000-0000-0000-000000000007', gen_random_uuid(), 'Marie-Claire Nze',     'Client','marienze@gmail.com',         'https://i.pravatar.cc/150?img=7',  '+24166000002', NULL,    NULL,    NULL,                                   'Nkembo, Libreville',                      0,      true,  true, NOW() - INTERVAL '65 days', NOW()),
  ('00000000-0000-0000-0000-000000000008', gen_random_uuid(), 'Paul Obame',           'Client','pobame@gmail.com',           'https://i.pravatar.cc/150?img=8',  '+24166000003', NULL,    NULL,    NULL,                                   'PK8, Libreville',                         0,      false, true, NOW() - INTERVAL '50 days', NOW()),
  ('00000000-0000-0000-0000-000000000009', gen_random_uuid(), 'Sandrine Mouele',      'Client','smouele@gmail.com',          'https://i.pravatar.cc/150?img=9',  '+24166000004', NULL,    NULL,    NULL,                                   'Angondjé, Libreville',                    0,      true,  true, NOW() - INTERVAL '45 days', NOW()),
  ('00000000-0000-0000-0000-000000000010', gen_random_uuid(), 'Éric Nguema',          'Client','ericnguema@gmail.com',       'https://i.pravatar.cc/150?img=10', '+24166000005', NULL,    NULL,    NULL,                                   'PK12, Libreville',                        0,      true,  true, NOW() - INTERVAL '30 days', NOW()),

  -- Livreurs
  ('00000000-0000-0000-0000-000000000011', gen_random_uuid(), 'Didier Koumba',        'Livreur', 'dkoumba@ewuang.com',         'https://i.pravatar.cc/150?img=11', '+24107000001', NULL,    NULL,    NULL,                                   'Libreville',                              35000,  true,  true, NOW() - INTERVAL '55 days', NOW()),
  ('00000000-0000-0000-0000-000000000012', gen_random_uuid(), 'Ariel Ndong',          'Livreur', 'andong@ewuang.com',          'https://i.pravatar.cc/150?img=12', '+24107000002', NULL,    NULL,    NULL,                                   'Libreville',                              22000,  true,  true, NOW() - INTERVAL '50 days', NOW());

-- ============================================================
-- 3. CATÉGORIES (hiérarchie parent → enfant)
-- ============================================================
INSERT INTO categories (id, nom, slug, description, image, parent_id, is_active, ordre, created_at, updated_at)
VALUES
  -- Catégories parentes
  ('10000000-0000-0000-0000-000000000001', 'Électronique',          'electronique',          'Téléphones, ordinateurs, accessoires tech',        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400', NULL,                                   true, 1, NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000002', 'Mode & Vêtements',      'mode-vetements',        'Vêtements homme, femme, enfant et accessoires',    'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400', NULL,                                   true, 2, NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000003', 'Maison & Déco',         'maison-deco',           'Meubles, décoration intérieure, électroménager',   'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400', NULL,                                   true, 3, NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000004', 'Beauté & Santé',        'beaute-sante',          'Cosmétiques, soins, parfums et bien-être',         'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400', NULL,                                   true, 4, NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000005', 'Sport & Loisirs',       'sport-loisirs',         'Équipements sportifs, jeux et loisirs',            'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400', NULL,                                   true, 5, NOW(), NOW()),

  -- Sous-catégories Électronique
  ('10000000-0000-0000-0000-000000000011', 'Téléphones & Tablettes', 'electronique-telephones','Smartphones, tablettes et accessoires',           'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', '10000000-0000-0000-0000-000000000001', true, 1, NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000012', 'Ordinateurs & PC',       'electronique-pc',        'Laptops, PC de bureau, accessoires informatique', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400', '10000000-0000-0000-0000-000000000001', true, 2, NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000013', 'Audio & Vidéo',          'electronique-audio',     'Écouteurs, enceintes, TV et home cinéma',         'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', '10000000-0000-0000-0000-000000000001', true, 3, NOW(), NOW()),

  -- Sous-catégories Mode
  ('10000000-0000-0000-0000-000000000021', 'Vêtements Homme',       'mode-homme',            'Chemises, pantalons, t-shirts homme',              'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400', '10000000-0000-0000-0000-000000000002', true, 1, NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000022', 'Vêtements Femme',       'mode-femme',            'Robes, jupes, hauts femme',                        'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400', '10000000-0000-0000-0000-000000000002', true, 2, NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000023', 'Chaussures',            'mode-chaussures',       'Chaussures homme, femme et enfant',                'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', '10000000-0000-0000-0000-000000000002', true, 3, NOW(), NOW()),

  -- Sous-catégories Maison
  ('10000000-0000-0000-0000-000000000031', 'Meubles',               'maison-meubles',        'Canapés, tables, chaises et rangements',           'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400', '10000000-0000-0000-0000-000000000003', true, 1, NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000032', 'Électroménager',        'maison-electromenager', 'Réfrigérateurs, machines à laver, micro-ondes',    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400', '10000000-0000-0000-0000-000000000003', true, 2, NOW(), NOW()),

  -- Sous-catégories Beauté
  ('10000000-0000-0000-0000-000000000041', 'Soins Visage',          'beaute-visage',         'Crèmes, sérums, masques visage',                   'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400', '10000000-0000-0000-0000-000000000004', true, 1, NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000042', 'Parfums',               'beaute-parfums',        'Eau de parfum et eau de toilette',                 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400', '10000000-0000-0000-0000-000000000004', true, 2, NOW(), NOW()),

  -- Sous-catégories Sport & Loisirs
  ('10000000-0000-0000-0000-000000000051', 'Fitness & Musculation', 'sport-fitness',         'Équipements de fitness et musculation',            'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400', '10000000-0000-0000-0000-000000000005', true, 1, NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000052', 'Sports Collectifs',     'sport-collectifs',      'Football, basket, volley et accessoires',          'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400', '10000000-0000-0000-0000-000000000005', true, 2, NOW(), NOW()),

  -- Nouvelle catégorie parente : Alimentation & Boissons
  ('10000000-0000-0000-0000-000000000006', 'Alimentation & Boissons','alimentation',         'Épicerie locale, produits du terroir et boissons','https://images.unsplash.com/photo-1542838132-92c53300491e?w=400', NULL,                                   true, 6, NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000061', 'Épicerie Locale',       'alimentation-epicerie', 'Produits gabonais, épices, condiments',            'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400', '10000000-0000-0000-0000-000000000006', true, 1, NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000062', 'Boissons',              'alimentation-boissons', 'Jus naturels, sodas, boissons traditionnelles',    'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400', '10000000-0000-0000-0000-000000000006', true, 2, NOW(), NOW()),

  -- Nouvelle catégorie parente : Bébé & Enfant
  ('10000000-0000-0000-0000-000000000007', 'Bébé & Enfant',         'bebe-enfant',           'Articles pour bébés et enfants',                   'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400', NULL,                                   true, 7, NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000071', 'Vêtements Bébé',        'bebe-vetements',        'Bodies, pyjamas et vêtements pour bébé',           'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=400', '10000000-0000-0000-0000-000000000007', true, 1, NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000072', 'Jouets',                'bebe-jouets',           'Jouets éducatifs et de divertissement',            'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400', '10000000-0000-0000-0000-000000000007', true, 2, NOW(), NOW());

-- ============================================================
-- 4. ARTICLES + VARIATIONS + IMAGES + STOCKS
-- ============================================================

-- === ÉLECTRONIQUE ===

-- Article 1 : Samsung Galaxy A54
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000001', 'Samsung Galaxy A54 5G 128GB', 'Smartphone Samsung Galaxy A54 avec écran Super AMOLED 6.4", puce Exynos 1380, 5G et batterie 5000mAh.', 285000, 265000, true, 7, false, '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000011', 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500', true, NOW() - INTERVAL '60 days', NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000001', 'Noir',    NULL, 25, 285000, 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000001', 'Blanc',   NULL, 18, 285000, 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000001', 'Violet',  NULL, 12, 285000, 'https://images.unsplash.com/photo-1574920162043-b872873f19bc?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800', '20000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800', '20000000-0000-0000-0000-000000000001');

-- Article 2 : Laptop HP Pavilion
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000002', 'HP Pavilion 15 Core i5 512GB SSD', 'Laptop HP avec Intel Core i5 11ème gen, 8GB RAM, SSD 512GB, écran FHD 15.6" et Windows 11.', 650000, NULL, false, 0, false, '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000012', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500', true, NOW() - INTERVAL '55 days', NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000002', 'Argent', NULL, 8,  650000, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000002', 'Gris',   NULL, 10, 650000, 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800', '20000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800', '20000000-0000-0000-0000-000000000002');

-- Article 3 : Écouteurs Sony WH-1000XM5
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000003', 'Sony WH-1000XM5 – Casque Bluetooth', 'Casque Sony avec réduction de bruit active, autonomie 30h, qualité audio Hi-Res et connexion multipoint.', 195000, 175000, true, 10, false, '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000013', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', true, NOW() - INTERVAL '45 days', NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000003', 'Noir',  NULL, 20, 195000, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000003', 'Blanc', NULL, 15, 195000, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', '20000000-0000-0000-0000-000000000003');

-- === MODE & VÊTEMENTS ===

-- Article 4 : Chemise Batik Homme
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000004', 'Chemise Batik Africain – Homme', 'Chemise en tissu batik 100% coton, coupe ajustée, motifs africains colorés. Fabriquée au Gabon.', 35000, NULL, false, 0, true, '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000021', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500', true, NOW() - INTERVAL '40 days', NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000004', 'Multicolore', 'S',  15, 35000, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000004', 'Multicolore', 'M',  22, 35000, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000004', 'Multicolore', 'L',  18, 35000, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000004', 'Multicolore', 'XL', 10, 35000, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800', '20000000-0000-0000-0000-000000000004');

-- Article 5 : Robe Wax Femme
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000005', 'Robe Wax Africaine – Femme', 'Robe longue en tissu wax authentique, motifs géométriques, fermeture zip dans le dos. Couture locale gabonaise.', 42000, 36000, true, 14, true, '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000022', 'https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=500', true, NOW() - INTERVAL '35 days', NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000005', 'Bleu/Jaune', 'S',  12, 42000, 'https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000005', 'Bleu/Jaune', 'M',  20, 42000, 'https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000005', 'Rouge/Noir', 'M',  8,  42000, 'https://images.unsplash.com/photo-1580612753390-c0a0-4b8c-8e4c-5d7b8e44f5b3?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000005', 'Rouge/Noir', 'L',  6,  42000, 'https://images.unsplash.com/photo-1580612753390-c0a0-4b8c-8e4c-5d7b8e44f5b3?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=800', '20000000-0000-0000-0000-000000000005');

-- Article 6 : Sneakers Nike Air Max
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000006', 'Nike Air Max 270 – Sneakers', 'Chaussures de sport Nike Air Max 270 avec semelle Air visible, amorti maximal et style streetwear.', 115000, 98000, true, 15, false, '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000023', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', true, NOW() - INTERVAL '30 days', NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000006', 'Noir/Blanc', '40', 8,  115000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000006', 'Noir/Blanc', '41', 12, 115000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000006', 'Noir/Blanc', '42', 15, 115000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000006', 'Blanc/Rouge','42', 10, 115000, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000006', 'Blanc/Rouge','43', 7,  115000, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', '20000000-0000-0000-0000-000000000006'),
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800', '20000000-0000-0000-0000-000000000006');

-- === MAISON & DÉCO ===

-- Article 7 : Canapé 3 places
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000007', 'Canapé 3 Places Tissu Gris', 'Canapé moderne 3 places en tissu résistant, pieds métal chromé, confort optimal pour votre salon.', 320000, NULL, false, 0, false, '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000031', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500', true, NOW() - INTERVAL '50 days', NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000007', 'Gris',  NULL, 5, 320000, 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000007', 'Beige', NULL, 3, 320000, 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800', '20000000-0000-0000-0000-000000000007');

-- Article 8 : Machine à laver Samsung
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000008', 'Machine à Laver Samsung 7kg Front', 'Lave-linge frontal Samsung 7kg, classe A+++, 1400 tours/min, programmes eco et silence.', 480000, 450000, true, 6, false, '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000032', 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=500', true, NOW() - INTERVAL '42 days', NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000008', 'Blanc', '7kg', 6, 480000, 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=800', '20000000-0000-0000-0000-000000000008');

-- === BEAUTÉ ===

-- Article 9 : Crème hydratante
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000009', 'Crème Hydratante Karité & Aloe Vera', 'Crème visage et corps à base de beurre de karité pur et gel d''aloe vera bio. Peau douce et lumineuse. Fabriquée au Gabon.', 12500, NULL, false, 0, true, '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000041', 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500', true, NOW() - INTERVAL '28 days', NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000009', NULL, '200ml', 40, 12500, 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000009', NULL, '500ml', 25, 19000, 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800', '20000000-0000-0000-0000-000000000009');

-- Article 10 : Parfum Dior Sauvage
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000010', 'Dior Sauvage Eau de Parfum 100ml', 'Fragrance masculine emblématique Dior Sauvage, notes fraiches et boisées, longue tenue 24h.', 125000, 110000, true, 12, false, '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000042', 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=500', true, NOW() - INTERVAL '20 days', NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000010', NULL, '100ml', 15, 125000, 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000010', NULL, '60ml',  20, 85000, 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=800', '20000000-0000-0000-0000-000000000010');

-- === SPORT & LOISIRS ===

-- Article 11 : Haltères réglables
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000011', 'Haltères Réglables – Paire 10/20kg', 'Paire d''haltères réglables en acier chromé avec revêtement antidérapant. Idéal pour la musculation à domicile.', 85000, 75000, true, 12, false, '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000051', 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500', true, NOW() - INTERVAL '15 days', NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000011', 'Noir', '10kg', 20, 45000, 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000011', 'Noir', '20kg', 12, 85000, 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800', '20000000-0000-0000-0000-000000000011');

-- Article 12 : Ballon de Football
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000012', 'Ballon de Football Adidas Taille 5', 'Ballon officiel Adidas, taille 5 (adulte), résistant et certifié FIFA Quality. Parfait pour les matchs et l''entraînement.', 18000, NULL, false, 0, false, '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000052', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500', true, NOW() - INTERVAL '10 days', NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000012', 'Blanc/Noir', '5', 30, 18000, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000012', 'Blanc/Rouge', '4', 25, 14000, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', '20000000-0000-0000-0000-000000000012');

-- === ALIMENTATION & BOISSONS ===

-- Article 13 : Épices du Gabon
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000013', 'Assortiment Épices du Gabon – 5 sachets', 'Mélange d''épices locales gabonaises : bâtons de cannelle, poivre de Guinée, mboula, ndomba et massep. 100% naturel, sans additifs.', 8500, NULL, false, 0, true, '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000061', 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=500', true, NOW() - INTERVAL '12 days', NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000013', NULL, '5 sachets',  50, 8500,  'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000013', NULL, '10 sachets', 30, 15000, 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=800', '20000000-0000-0000-0000-000000000013');

-- Article 14 : Jus naturel
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000014', 'Jus de Bissap & Gingembre 1L', 'Boisson naturelle à base de fleurs de bissap (hibiscus) et gingembre frais. Sans sucre ajouté, riche en antioxydants. Produit local gabonais.', 3500, NULL, false, 0, true, '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000062', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=500', true, NOW() - INTERVAL '8 days', NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000014', NULL, '1L', 80, 3500,  'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000014', NULL, '2L', 45, 6500,  'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000014', NULL, '5L', 20, 14000, 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800', '20000000-0000-0000-0000-000000000014');

-- === BÉBÉ & ENFANT ===

-- Article 15 : Bodies bébé
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000015', 'Pack 5 Bodies Bébé 0-6 mois', 'Lot de 5 bodies bébé en coton bio 100%, doux pour les peaux sensibles, fermeture pression. Lavable en machine. Fabriqué localement.', 15000, 12500, true, 17, true, '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000071', 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=500', true, NOW() - INTERVAL '6 days', NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000015', 'Blanc',      '0-3 mois', 35, 15000, 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000015', 'Blanc',      '3-6 mois', 30, 15000, 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000015', 'Multicolore','0-3 mois', 20, 15000, 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000015', 'Multicolore','3-6 mois', 18, 15000, 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=800', '20000000-0000-0000-0000-000000000015');

-- Article 16 : Puzzle éducatif
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000016', 'Puzzle Éducatif Animaux d''Afrique 50 pièces', 'Puzzle en bois 50 pièces représentant les animaux d''Afrique. Pour enfants 3-8 ans. Peint avec peintures non toxiques. Fabriqué au Gabon.', 9500, NULL, false, 0, true, '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000072', 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=500', true, NOW() - INTERVAL '4 days', NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000016', NULL, '50 pièces',  40, 9500,  'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000016', NULL, '100 pièces', 25, 16000, 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800', '20000000-0000-0000-0000-000000000016');

-- === NOUVEAUX PRODUITS MADE IN GABON ===

-- Article 17 : Savon artisanal huile de palme (NOUVEAU)
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000017', 'Savon Artisanal Huile de Palme & Cacao', 'Savon 100% naturel fabriqué à Libreville à base d''huile de palme rouge et beurre de cacao bio. Sans produit chimique, idéal peaux sensibles.', 4500, NULL, false, 0, true, '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000041', 'https://images.unsplash.com/photo-1600857062241-98e5dba7f025?w=500', true, NOW(), NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000017', NULL, '100g',      60, 4500,  'https://images.unsplash.com/photo-1600857062241-98e5dba7f025?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000017', NULL, 'Pack x3',   40, 12000, 'https://images.unsplash.com/photo-1600857062241-98e5dba7f025?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000017', NULL, 'Pack x6',   25, 22000, 'https://images.unsplash.com/photo-1600857062241-98e5dba7f025?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1600857062241-98e5dba7f025?w=800', '20000000-0000-0000-0000-000000000017');

-- Article 18 : Huile de coco vierge (NOUVEAU)
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000018', 'Huile de Coco Vierge Pressée à Froid 250ml', 'Huile de coco 100% pure extraite à froid, non raffinée. Usage cheveux, peau et cuisine. Produite artisanalement au Gabon.', 7500, 6500, true, 13, true, '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000041', 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=500', true, NOW(), NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000018', NULL, '250ml', 45, 7500,  'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000018', NULL, '500ml', 30, 13500, 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000018', NULL, '1L',    18, 24000, 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800', '20000000-0000-0000-0000-000000000018');

-- Article 19 : T-shirt coton bio Gabon (NOUVEAU)
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000019', 'T-shirt Coton Bio – Motif Okapi du Gabon', 'T-shirt unisexe en coton biologique, imprimé d''un okapi stylisé. Coupe moderne, col rond. Cousu et imprimé localement à Libreville.', 18000, NULL, false, 0, true, '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000021', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', true, NOW(), NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000019', 'Blanc', 'S',  20, 18000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000019', 'Blanc', 'M',  30, 18000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000019', 'Blanc', 'L',  25, 18000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000019', 'Noir',  'S',  15, 18000, 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000019', 'Noir',  'M',  22, 18000, 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000019', 'Noir',  'L',  18, 18000, 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', '20000000-0000-0000-0000-000000000019'),
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800', '20000000-0000-0000-0000-000000000019');

-- Article 20 : Sculpture en bois d'Okoumé (NOUVEAU)
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000020', 'Sculpture en Bois d''Okoumé – Masque Traditionnel', 'Masque traditionnel gabonais sculpté à la main dans du bois d''okoumé massif. Pièce unique signée par un artisan de Port-Gentil. Décoration ou collection.', 55000, 48000, true, 13, true, '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000031', 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=500', true, NOW(), NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000020', 'Naturel',  'Petit (20cm)',  12, 55000, 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000020', 'Naturel',  'Grand (35cm)',  6,  85000, 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000020', 'Peint',    'Petit (20cm)',  8,  62000, 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800', '20000000-0000-0000-0000-000000000020');

-- Article 21 : Tisane plantes du Gabon (NOUVEAU)
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000021', 'Tisane Détox Plantes du Gabon – 20 sachets', 'Mélange de plantes médicinales gabonaises : iboga, écorce de quinquina local, feuilles de neem. Détox et bien-être. Conditionnement artisanal.', 6000, NULL, false, 0, true, '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000061', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500', true, NOW(), NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000021', NULL, '20 sachets', 55, 6000,  'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000021', NULL, '40 sachets', 30, 11000, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800', '20000000-0000-0000-0000-000000000021');

-- Article 22 : Pagne tissé main (NOUVEAU)
INSERT INTO articles (id, nom, description, prix, prix_promotion, is_promotion, pourcentage_reduction, made_in_gabon, user_id, categorie_id, image_principale, is_active, created_at, updated_at)
VALUES ('20000000-0000-0000-0000-000000000022', 'Pagne Tissé Main – Motifs Fang', 'Pagne 2m x 1,20m tissé à la main par des artisanes gabonaises, motifs géométriques Fang aux couleurs vives. Chaque pièce est unique.', 28000, NULL, false, 0, true, '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000022', 'https://images.unsplash.com/photo-1614948844836-94a7dbb50adf?w=500', true, NOW(), NOW());
INSERT INTO variations (id, article_id, couleur, taille, stock, prix, image, created_at, updated_at) VALUES
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000022', 'Rouge/Or',    '2m x 1,20m', 15, 28000, 'https://images.unsplash.com/photo-1614948844836-94a7dbb50adf?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000022', 'Bleu/Blanc',  '2m x 1,20m', 12, 28000, 'https://images.unsplash.com/photo-1614948844836-94a7dbb50adf?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000022', 'Vert/Jaune',  '2m x 1,20m', 10, 28000, 'https://images.unsplash.com/photo-1614948844836-94a7dbb50adf?w=300', NOW(), NOW()),
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000022', 'Multicolore', '4m x 1,20m', 8,  52000, 'https://images.unsplash.com/photo-1614948844836-94a7dbb50adf?w=300', NOW(), NOW());
INSERT INTO image_articles (id, url_photo, article_id) VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1614948844836-94a7dbb50adf?w=800', '20000000-0000-0000-0000-000000000022');

-- ============================================================
-- 5. PAIEMENTS
-- ============================================================
INSERT INTO paiements (id, user_id, montant, methode, statut, reference, transaction_id, created_at, updated_at)
VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 285000, 'mobile_money', 'Validé',    'PAY-2024-001-JBMBA',  'TXN001AIRTEL', NOW() - INTERVAL '30 days', NOW()),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000007', 77000,  'mobile_money', 'Validé',    'PAY-2024-002-MCNZE',  'TXN002MOOV',   NOW() - INTERVAL '25 days', NOW()),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000008', 650000, 'carte',        'Validé',    'PAY-2024-003-POBAME', 'TXN003VISA',   NOW() - INTERVAL '20 days', NOW()),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000009', 115000, 'mobile_money', 'En attente','PAY-2024-004-SMOUELE',NULL,           NOW() - INTERVAL '5 days',  NOW()),
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', 195000, 'especes',      'Validé',    'PAY-2024-005-ERICN',  NULL,           NOW() - INTERVAL '10 days', NOW());

-- ============================================================
-- 6. COMMANDES
-- ============================================================
INSERT INTO commandes (id, numero, statut, prix, commentaire, "isLivrable", user_id, vendeur_id, paiement_id, adresse_livraison, created_at, updated_at)
VALUES
  ('40000000-0000-0000-0000-000000000001', 'CMD-2024-001', 'Livrée',                285000, 'Livraison rapide SVP', true,  '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Lalala, Quartier Nord, Libreville',       NOW() - INTERVAL '30 days', NOW()),
  ('40000000-0000-0000-0000-000000000002', 'CMD-2024-002', 'Livrée',                77000,  'Merci pour le wax',   true,  '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'Nkembo, Rue 12, Libreville',              NOW() - INTERVAL '25 days', NOW()),
  ('40000000-0000-0000-0000-000000000003', 'CMD-2024-003', 'En préparation',        650000, 'Appeler avant',       true,  '00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', 'PK8, Résidence Cité Belle, Libreville',   NOW() - INTERVAL '20 days', NOW()),
  ('40000000-0000-0000-0000-000000000004', 'CMD-2024-004', 'En attente',            115000, 'Pointure 42 svp',     true,  '00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000004', 'Angondjé, Boulevard, Libreville',         NOW() - INTERVAL '5 days',  NOW()),
  ('40000000-0000-0000-0000-000000000005', 'CMD-2024-005', 'Prête pour livraison',  195000, 'Casque noir',         true,  '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000005', 'PK12, Cité de la SEEG, Libreville',       NOW() - INTERVAL '10 days', NOW()),
  ('40000000-0000-0000-0000-000000000006', 'CMD-2024-006', 'En cours de livraison', 42000,  'Robe taille M rouge', true,  '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000003', NULL,                                          'Lalala, Quartier Nord, Libreville',       NOW() - INTERVAL '3 days',  NOW()),
  ('40000000-0000-0000-0000-000000000007', 'CMD-2024-007', 'Annulée',               125000, 'Plus besoin',         false, '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000005', NULL,                                          'Nkembo, Rue 12, Libreville',              NOW() - INTERVAL '15 days', NOW());

-- ============================================================
-- 7. ARTICLES DES COMMANDES
-- ============================================================
INSERT INTO commande_articles (id, commande_id, article_id, variation_id, quantite, prix_unitaire, created_at, updated_at)
SELECT gen_random_uuid(), '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', v.id, 1, 265000, NOW(), NOW()
FROM variations v WHERE v.article_id = '20000000-0000-0000-0000-000000000001' AND v.couleur = 'Noir' LIMIT 1;

INSERT INTO commande_articles (id, commande_id, article_id, variation_id, quantite, prix_unitaire, created_at, updated_at)
SELECT gen_random_uuid(), '40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000005', v.id, 1, 36000, NOW(), NOW()
FROM variations v WHERE v.article_id = '20000000-0000-0000-0000-000000000005' AND v.taille = 'M' LIMIT 1;

INSERT INTO commande_articles (id, commande_id, article_id, variation_id, quantite, prix_unitaire, created_at, updated_at)
SELECT gen_random_uuid(), '40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', v.id, 1, 35000, NOW(), NOW()
FROM variations v WHERE v.article_id = '20000000-0000-0000-0000-000000000004' AND v.taille = 'L' LIMIT 1;

INSERT INTO commande_articles (id, commande_id, article_id, variation_id, quantite, prix_unitaire, created_at, updated_at)
SELECT gen_random_uuid(), '40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', v.id, 1, 650000, NOW(), NOW()
FROM variations v WHERE v.article_id = '20000000-0000-0000-0000-000000000002' LIMIT 1;

INSERT INTO commande_articles (id, commande_id, article_id, variation_id, quantite, prix_unitaire, created_at, updated_at)
SELECT gen_random_uuid(), '40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000006', v.id, 1, 98000, NOW(), NOW()
FROM variations v WHERE v.article_id = '20000000-0000-0000-0000-000000000006' AND v.taille = '42' LIMIT 1;

INSERT INTO commande_articles (id, commande_id, article_id, variation_id, quantite, prix_unitaire, created_at, updated_at)
SELECT gen_random_uuid(), '40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003', v.id, 1, 175000, NOW(), NOW()
FROM variations v WHERE v.article_id = '20000000-0000-0000-0000-000000000003' AND v.couleur = 'Noir' LIMIT 1;

INSERT INTO commande_articles (id, commande_id, article_id, variation_id, quantite, prix_unitaire, created_at, updated_at)
SELECT gen_random_uuid(), '40000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000005', v.id, 1, 36000, NOW(), NOW()
FROM variations v WHERE v.article_id = '20000000-0000-0000-0000-000000000005' AND v.couleur = 'Rouge/Noir' LIMIT 1;

INSERT INTO commande_articles (id, commande_id, article_id, variation_id, quantite, prix_unitaire, created_at, updated_at)
SELECT gen_random_uuid(), '40000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000010', v.id, 1, 110000, NOW(), NOW()
FROM variations v WHERE v.article_id = '20000000-0000-0000-0000-000000000010' LIMIT 1;

-- ============================================================
-- 8. LIVRAISONS
-- ============================================================
INSERT INTO livraisons (id, adresse, details, statut, date_livraison, ville, phone, commande_id, user_id, livreur_id, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Lalala, Quartier Nord', 'Maison bleue, porte 3',                'livree',              NOW() - INTERVAL '28 days', 'Libreville', '+24166000001', '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000011', NOW() - INTERVAL '30 days', NOW()),
  (gen_random_uuid(), 'Nkembo, Rue 12',        'Appartement 2B, résidence Les Palmiers','livree',              NOW() - INTERVAL '23 days', 'Libreville', '+24166000002', '40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000012', NOW() - INTERVAL '25 days', NOW()),
  (gen_random_uuid(), 'PK12, Cité SEEG',       'Bloc B, appartement 5',                'en_cours_de_livraison',NOW() + INTERVAL '1 day',  'Libreville', '+24166000005', '40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011', NOW() - INTERVAL '10 days', NOW()),
  (gen_random_uuid(), 'Lalala, Quartier Nord', 'Maison bleue, porte 3',                'en_cours_de_livraison',NOW() + INTERVAL '2 days', 'Libreville', '+24166000001', '40000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000012', NOW() - INTERVAL '3 days',  NOW());

-- ============================================================
-- 9. RÉCLAMATIONS
-- ============================================================
INSERT INTO reclamations (id, description, phone, statut, commande_id, user_id, reponse, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'La robe reçue n''est pas la bonne taille, j''ai commandé M mais reçu S.', '+24166000002', 'En cours', '40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000007', 'Nous vous prions de nous excuser. Un retour est en cours de traitement.', NOW() - INTERVAL '20 days', NOW()),
  (gen_random_uuid(), 'Mon colis n''est pas encore arrivé après 2 semaines.', '+24166000001', 'En attente de traitement', '40000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000006', NULL, NOW() - INTERVAL '2 days', NOW());

-- ============================================================
-- 10. AVIS / REVIEWS
-- ============================================================
INSERT INTO avis (id, user_id, article_id, note, commentaire, is_moderated, is_visible, created_at, updated_at)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', 5, 'Excellent téléphone, livraison rapide. Je recommande vivement TechGabon !',          true,  true, NOW() - INTERVAL '25 days', NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000005', 4, 'Très belle robe, tissu de qualité. Le wax est authentique. Satisfaite à 100%.',    true,  true, NOW() - INTERVAL '22 days', NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000002', 5, 'Laptop rapide, bon rapport qualité-prix pour le Gabon. Livraison soignée.',         false, true, NOW() - INTERVAL '18 days', NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000003', 4, 'Casque Sony excellent, réduction de bruit parfaite. Petit bémol: le prix.',        true,  true, NOW() - INTERVAL '8 days',  NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000009', 5, 'Crème naturelle gabonaise au top ! Ma peau est très douce. Produit authentique.', true,  true, NOW() - INTERVAL '5 days',  NOW());

-- ============================================================
-- 11. FAVORIS
-- ============================================================
INSERT INTO favoris (id, user_id, article_id, created_at)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000003', NOW() - INTERVAL '20 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000005', NOW() - INTERVAL '15 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '18 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000010', NOW() - INTERVAL '10 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000002', NOW() - INTERVAL '12 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000009', NOW() - INTERVAL '7 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000006', NOW() - INTERVAL '5 days');

-- ============================================================
-- 12. PANIERS & ITEMS
-- ============================================================
INSERT INTO paniers (id, user_id, created_at, updated_at)
VALUES
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000008', NOW(), NOW()),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000009', NOW(), NOW());

INSERT INTO panier_items (id, panier_id, article_id, variation_id, quantite, created_at, updated_at)
SELECT gen_random_uuid(), '50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', v.id, 1, NOW(), NOW()
FROM variations v WHERE v.article_id = '20000000-0000-0000-0000-000000000006' AND v.taille = '42' LIMIT 1;

INSERT INTO panier_items (id, panier_id, article_id, variation_id, quantite, created_at, updated_at)
SELECT gen_random_uuid(), '50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000009', v.id, 2, NOW(), NOW()
FROM variations v WHERE v.article_id = '20000000-0000-0000-0000-000000000009' AND v.taille = '200ml' LIMIT 1;

INSERT INTO panier_items (id, panier_id, article_id, variation_id, quantite, created_at, updated_at)
SELECT gen_random_uuid(), '50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', v.id, 1, NOW(), NOW()
FROM variations v WHERE v.article_id = '20000000-0000-0000-0000-000000000004' AND v.taille = 'M' LIMIT 1;

-- ============================================================
-- 13. PUBLICITÉS
-- ============================================================
INSERT INTO publicites (id, date_start, date_end, titre, url_image, lien, description, is_actif, created_at, updated_at)
VALUES
  (gen_random_uuid(), '2026-04-01', '2026-06-30', 'Soldes Tech – Jusqu''à -20%',                      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200', '/articles?categorie=electronique', 'Découvrez nos offres exceptionnelles sur les smartphones et laptops !',    true, NOW(), NOW()),
  (gen_random_uuid(), '2026-04-10', '2026-05-10', 'Nouvelle Collection Mode Gabonaise',                'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1200', '/articles?categorie=mode',         'Vêtements wax, batik et pagne – La mode africaine à votre porte.',        true, NOW(), NOW()),
  (gen_random_uuid(), '2026-04-15', '2026-07-15', 'Livraison Offerte dès 50 000 FCFA',                'https://images.unsplash.com/photo-1602526219050-2cc8302d91b3?w=1200', '/articles',                        'Commandez maintenant et profitez de la livraison gratuite à Libreville.', true, NOW(), NOW()),
  (gen_random_uuid(), '2026-04-01', '2026-04-30', 'Spécial Made in Gabon – Soutien local',            'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=1200', '/articles?made_in_gabon=true',     'Produits 100% fabriqués au Gabon – Achetez local, soutenez l''économie.', true, NOW(), NOW()),
  (gen_random_uuid(), '2026-05-01', '2026-05-31', 'Promo Maison & Électroménager – Juin',             'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200', '/articles?categorie=maison',       'Équipez votre maison à prix réduit. Offres limitées sur les meubles.',    false, NOW(), NOW());

-- ============================================================
-- 14. NOTIFICATIONS
-- ============================================================
INSERT INTO notifications (id, user_id, type, titre, message, lien, is_read, created_at)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000006', 'Commande',  'Commande livrée !',           'Votre commande CMD-2024-001 a été livrée avec succès.',               '/commandes/40000000-0000-0000-0000-000000000001', true,  NOW() - INTERVAL '28 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000007', 'Commande',  'Commande livrée !',           'Votre commande CMD-2024-002 a été livrée avec succès.',               '/commandes/40000000-0000-0000-0000-000000000002', true,  NOW() - INTERVAL '23 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000008', 'Commande',  'Commande en préparation',     'Votre commande CMD-2024-003 est en cours de préparation.',            '/commandes/40000000-0000-0000-0000-000000000003', false, NOW() - INTERVAL '20 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', 'Livraison', 'Livraison en cours',          'Votre commande CMD-2024-005 est en route. Arrivée prévue demain.',    '/commandes/40000000-0000-0000-0000-000000000005', false, NOW() - INTERVAL '10 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 'Avis',      'Nouvel avis sur votre article','Jean-Baptiste a laissé un avis 5 étoiles sur Samsung Galaxy A54.',   '/articles/20000000-0000-0000-0000-000000000001',  false, NOW() - INTERVAL '25 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', 'Commande',  'Nouvelle commande reçue',     'Vous avez une nouvelle commande CMD-2024-006 de Sandrine Mouele.',    '/commandes/40000000-0000-0000-0000-000000000006', false, NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000009', 'Promotion', 'Offre spéciale pour vous !',  'Profitez de -14% sur nos robes wax. Offre valable jusqu''au 30 avril.','/articles?categorie=mode',                        false, NOW() - INTERVAL '1 day');

-- ============================================================
-- 15. CONVERSATIONS
-- ============================================================
INSERT INTO conversations (id, sender_id, receiver_id, message, is_read, created_at)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'Bonjour, est-ce que le Samsung Galaxy A54 est disponible en violet ?', true,  NOW() - INTERVAL '32 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006', 'Oui, il est disponible ! Voulez-vous passer commande ?',                true,  NOW() - INTERVAL '32 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'Parfait, je commande de suite. Merci !',                                true,  NOW() - INTERVAL '31 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000003', 'La robe wax est encore disponible en taille S ?',                       true,  NOW() - INTERVAL '27 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000007', 'Oui, il en reste 12 en taille S. Disponible immédiatement.',            true,  NOW() - INTERVAL '27 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000005', 'Bonjour, la crème karité est-elle adaptée aux peaux sensibles ?',       false, NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'Avez-vous d''autres modèles de casques Sony disponibles ?',             false, NOW() - INTERVAL '1 day');

-- ============================================================
-- VÉRIFICATION FINALE
-- ============================================================
DO $$
DECLARE
  v_users     INT; v_categories INT; v_articles    INT;
  v_commandes INT; v_livraisons INT; v_publicites  INT;
  v_avis      INT; v_favoris    INT; v_paniers     INT;
  v_notifs    INT; v_convs      INT;
BEGIN
  SELECT COUNT(*) INTO v_users      FROM users;
  SELECT COUNT(*) INTO v_categories FROM categories;
  SELECT COUNT(*) INTO v_articles   FROM articles;
  SELECT COUNT(*) INTO v_commandes  FROM commandes;
  SELECT COUNT(*) INTO v_livraisons FROM livraisons;
  SELECT COUNT(*) INTO v_publicites FROM publicites;
  SELECT COUNT(*) INTO v_avis       FROM avis;
  SELECT COUNT(*) INTO v_favoris    FROM favoris;
  SELECT COUNT(*) INTO v_paniers    FROM paniers;
  SELECT COUNT(*) INTO v_notifs     FROM notifications;
  SELECT COUNT(*) INTO v_convs      FROM conversations;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'SEEDER TERMINÉ AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users:        %', v_users;
  RAISE NOTICE 'Catégories:   %', v_categories;
  RAISE NOTICE 'Articles:     %', v_articles;
  RAISE NOTICE 'Commandes:    %', v_commandes;
  RAISE NOTICE 'Livraisons:   %', v_livraisons;
  RAISE NOTICE 'Publicités:   %', v_publicites;
  RAISE NOTICE 'Avis:         %', v_avis;
  RAISE NOTICE 'Favoris:      %', v_favoris;
  RAISE NOTICE 'Paniers:      %', v_paniers;
  RAISE NOTICE 'Notifications:%', v_notifs;
  RAISE NOTICE 'Conversations:%', v_convs;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Comptes de test:';
  RAISE NOTICE '  Admin:   admin@ewuang.com';
  RAISE NOTICE '  Vendeur: techgabon@ewuang.com';
  RAISE NOTICE '  Vendeur: modegabon@ewuang.com';
  RAISE NOTICE '  Acheteur:jbmba@gmail.com';
  RAISE NOTICE '  Livreur: dkoumba@ewuang.com';
  RAISE NOTICE '========================================';
END $$;
