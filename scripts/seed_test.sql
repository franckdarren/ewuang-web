-- ============================================================
-- SEED DE TEST EWUANG
-- ⚠️  À exécuter dans Supabase SQL Editor
-- Mot de passe de tous les comptes : Test1234!
-- ============================================================

-- ============================================================
-- 0. NETTOYAGE
-- ============================================================
SET session_replication_role = replica;
TRUNCATE TABLE
  panier_items, paniers, conversations, notifications, avis, favoris,
  reclamations, livraisons, article_commandes, commande_articles,
  commandes, paiements, stocks, image_articles, variations, articles,
  publicites, categories, users
CASCADE;
DELETE FROM auth.users WHERE email IN (
  'client1@test.com', 'client2@test.com',
  'boutique1@test.com', 'boutique2@test.com', 'boutique3@test.com',
  'livreur1@test.com'
);
SET session_replication_role = DEFAULT;

DO $$
DECLARE
  -- Auth IDs
  v_auth_client1    UUID := gen_random_uuid();
  v_auth_client2    UUID := gen_random_uuid();
  v_auth_b1         UUID := gen_random_uuid();
  v_auth_b2         UUID := gen_random_uuid();
  v_auth_b3         UUID := gen_random_uuid();
  v_auth_livreur    UUID := gen_random_uuid();

  -- Profile IDs (fixes pour traçabilité)
  v_client1   UUID := '11111111-1111-1111-1111-111111111111';
  v_client2   UUID := '22222222-2222-2222-2222-222222222222';
  v_b1        UUID := '33333333-3333-3333-3333-333333333333'; -- TechGabon
  v_b2        UUID := '44444444-4444-4444-4444-444444444444'; -- Mode Gabonaise
  v_b3        UUID := '55555555-5555-5555-5555-555555555555'; -- Beauté & Maison
  v_livreur   UUID := '66666666-6666-6666-6666-666666666666';

  -- Catégories
  v_elec   UUID;
  v_mode   UUID;
  v_maison UUID;
  v_cosme  UUID;
  v_sport  UUID;

  v_a UUID; -- article courant
  v_c UUID; -- commande courante

BEGIN

-- ============================================================
-- 1. AUTH USERS
-- ============================================================
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change)
VALUES
  (v_auth_client1, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','client1@test.com',   crypt('Test1234!',gen_salt('bf')),NOW(),'{"provider":"email","providers":["email"]}','{"name":"Alice Dupont"}',   NOW(),NOW(),'','','',''),
  (v_auth_client2, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','client2@test.com',   crypt('Test1234!',gen_salt('bf')),NOW(),'{"provider":"email","providers":["email"]}','{"name":"Bob Martin"}',     NOW(),NOW(),'','','',''),
  (v_auth_b1,      '00000000-0000-0000-0000-000000000000','authenticated','authenticated','boutique1@test.com', crypt('Test1234!',gen_salt('bf')),NOW(),'{"provider":"email","providers":["email"]}','{"name":"TechGabon Store"}', NOW(),NOW(),'','','',''),
  (v_auth_b2,      '00000000-0000-0000-0000-000000000000','authenticated','authenticated','boutique2@test.com', crypt('Test1234!',gen_salt('bf')),NOW(),'{"provider":"email","providers":["email"]}','{"name":"Mode Gabonaise"}',  NOW(),NOW(),'','','',''),
  (v_auth_b3,      '00000000-0000-0000-0000-000000000000','authenticated','authenticated','boutique3@test.com', crypt('Test1234!',gen_salt('bf')),NOW(),'{"provider":"email","providers":["email"]}','{"name":"Beauté & Maison"}', NOW(),NOW(),'','','',''),
  (v_auth_livreur, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','livreur1@test.com',  crypt('Test1234!',gen_salt('bf')),NOW(),'{"provider":"email","providers":["email"]}','{"name":"Jean Livreur"}',    NOW(),NOW(),'','','','');

INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
VALUES
  (gen_random_uuid(), v_auth_client1, jsonb_build_object('sub',v_auth_client1,'email','client1@test.com'),   'email',NOW(),NOW(),NOW(),v_auth_client1::text),
  (gen_random_uuid(), v_auth_client2, jsonb_build_object('sub',v_auth_client2,'email','client2@test.com'),   'email',NOW(),NOW(),NOW(),v_auth_client2::text),
  (gen_random_uuid(), v_auth_b1,      jsonb_build_object('sub',v_auth_b1,     'email','boutique1@test.com'), 'email',NOW(),NOW(),NOW(),v_auth_b1::text),
  (gen_random_uuid(), v_auth_b2,      jsonb_build_object('sub',v_auth_b2,     'email','boutique2@test.com'), 'email',NOW(),NOW(),NOW(),v_auth_b2::text),
  (gen_random_uuid(), v_auth_b3,      jsonb_build_object('sub',v_auth_b3,     'email','boutique3@test.com'), 'email',NOW(),NOW(),NOW(),v_auth_b3::text),
  (gen_random_uuid(), v_auth_livreur, jsonb_build_object('sub',v_auth_livreur,'email','livreur1@test.com'),  'email',NOW(),NOW(),NOW(),v_auth_livreur::text);

-- ============================================================
-- 2. PROFILS PUBLIC.USERS
-- ============================================================
INSERT INTO users (id, auth_id, name, role, email, url_logo, phone, description, solde, is_verified, is_active, created_at, updated_at)
VALUES
  (v_client1, v_auth_client1, 'Alice Dupont',    'Client',   'client1@test.com',   'https://i.pravatar.cc/150?img=10', '+24177100001', NULL,                                                0,      true,  true, NOW(), NOW()),
  (v_client2, v_auth_client2, 'Bob Martin',      'Client',   'client2@test.com',   'https://i.pravatar.cc/150?img=11', '+24177100002', NULL,                                                0,      true,  true, NOW(), NOW()),
  (v_b1,      v_auth_b1,      'TechGabon Store', 'Boutique', 'boutique1@test.com', 'https://i.pravatar.cc/150?img=20', '+24177100003', 'Spécialiste en électronique et high-tech.',         350000, true,  true, NOW(), NOW()),
  (v_b2,      v_auth_b2,      'Mode Gabonaise',  'Boutique', 'boutique2@test.com', 'https://i.pravatar.cc/150?img=21', '+24177100004', 'Mode africaine : wax, batik, pagne et accessoires.',180000, true,  true, NOW(), NOW()),
  (v_b3,      v_auth_b3,      'Beauté & Maison', 'Boutique', 'boutique3@test.com', 'https://i.pravatar.cc/150?img=22', '+24177100005', 'Cosmétiques naturels, mobilier et déco intérieur.', 95000,  false, true, NOW(), NOW()),
  (v_livreur, v_auth_livreur, 'Jean Livreur',    'Livreur',  'livreur1@test.com',  'https://i.pravatar.cc/150?img=30', '+24177100006', NULL,                                                0,      true,  true, NOW(), NOW());

-- ============================================================
-- 3. CATÉGORIES
-- ============================================================
INSERT INTO categories (id, nom, slug, description, is_active, created_at, updated_at) VALUES
  (gen_random_uuid(), 'Électronique', 'electronique', 'Smartphones, laptops, accessoires tech', true, NOW(), NOW()),
  (gen_random_uuid(), 'Mode',         'mode',         'Vêtements, chaussures et accessoires',   true, NOW(), NOW()),
  (gen_random_uuid(), 'Maison',       'maison',       'Mobilier, décoration, électroménager',   true, NOW(), NOW()),
  (gen_random_uuid(), 'Cosmétiques',  'cosmetiques',  'Soins, maquillage, parfums',              true, NOW(), NOW()),
  (gen_random_uuid(), 'Sport',        'sport',        'Équipements et vêtements de sport',       true, NOW(), NOW());

SELECT id INTO v_elec   FROM categories WHERE slug='electronique' LIMIT 1;
SELECT id INTO v_mode   FROM categories WHERE slug='mode'         LIMIT 1;
SELECT id INTO v_maison FROM categories WHERE slug='maison'       LIMIT 1;
SELECT id INTO v_cosme  FROM categories WHERE slug='cosmetiques'  LIMIT 1;
SELECT id INTO v_sport  FROM categories WHERE slug='sport'        LIMIT 1;

-- ============================================================
-- 4. ARTICLES — BOUTIQUE 1 : TechGabon (Électronique & Sport)
-- ============================================================

-- Électronique
v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'iPhone 15 128GB','Puce A16 Bionic, appareil photo 48MP, Dynamic Island.',950000,899000,true,5,false,v_b1,v_elec,'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500',true,NOW(),NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,'Noir',NULL,10,950000),(gen_random_uuid(),v_a,'Blanc',NULL,8,950000),(gen_random_uuid(),v_a,'Rose',NULL,5,950000);
INSERT INTO image_articles (id,url_photo,article_id) VALUES (gen_random_uuid(),'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800',v_a),(gen_random_uuid(),'https://images.unsplash.com/photo-1696446702183-cbd80a1c2e0d?w=800',v_a);

v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Samsung Galaxy S24','Écran AMOLED 6.2", Exynos 2400, 50MP triple caméra.',720000,650000,true,10,false,v_b1,v_elec,'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500',true,NOW()-INTERVAL '1 day',NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,'Onyx Noir',NULL,12,720000),(gen_random_uuid(),v_a,'Marbre Gris',NULL,7,720000);
INSERT INTO image_articles (id,url_photo,article_id) VALUES (gen_random_uuid(),'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800',v_a);

v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Laptop HP Pavilion 15','Core i5 12e gen, 8GB RAM, 512GB SSD, écran FHD.',650000,0,false,0,false,v_b1,v_elec,'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500',true,NOW()-INTERVAL '2 days',NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,'Argent',NULL,5,650000),(gen_random_uuid(),v_a,'Bleu nuit',NULL,3,650000);
INSERT INTO image_articles (id,url_photo,article_id) VALUES (gen_random_uuid(),'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800',v_a);

v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Écouteurs Sony WH-1000XM5','Réduction de bruit active, 30h autonomie, Bluetooth 5.2.',280000,240000,true,14,false,v_b1,v_elec,'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=500',true,NOW()-INTERVAL '3 days',NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,'Noir',NULL,15,280000),(gen_random_uuid(),v_a,'Blanc',NULL,7,280000);

v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Samsung Galaxy Tab S9','Écran AMOLED 11", S Pen inclus, 128GB stockage.',420000,380000,true,10,false,v_b1,v_elec,'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=500',true,NOW()-INTERVAL '4 days',NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,'Graphite',NULL,6,420000),(gen_random_uuid(),v_a,'Beige',NULL,4,420000);

-- Sport (TechGabon vend aussi des montres connectées)
v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Apple Watch Series 9','GPS, suivi santé 24/7, écran Always-On Retina.',320000,290000,true,9,false,v_b1,v_sport,'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500',true,NOW()-INTERVAL '1 day',NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,'Minuit',NULL,8,320000),(gen_random_uuid(),v_a,'Lumière stellaire',NULL,6,320000);

v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Garmin Forerunner 265','GPS running avancé, 13 jours batterie, cardio optique.',380000,0,false,0,false,v_b1,v_sport,'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=500',true,NOW()-INTERVAL '2 days',NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,'Noir/Rouge',NULL,4,380000);

-- ============================================================
-- 5. ARTICLES — BOUTIQUE 2 : Mode Gabonaise (Mode & Sport)
-- ============================================================

v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Robe Wax Africaine Longue','Robe en tissu wax authentique, coupe moderne et élégante.',45000,38000,true,16,true,v_b2,v_mode,'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500',true,NOW(),NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,'Bleu/Jaune','S',8,45000),(gen_random_uuid(),v_a,'Bleu/Jaune','M',12,45000),(gen_random_uuid(),v_a,'Bleu/Jaune','L',6,45000),(gen_random_uuid(),v_a,'Rouge/Noir','M',5,45000);
INSERT INTO image_articles (id,url_photo,article_id) VALUES (gen_random_uuid(),'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800',v_a),(gen_random_uuid(),'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800',v_a);

v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Chemise Batik Homme','Chemise longue batik, idéale pour occasions festives.',32000,0,false,0,true,v_b2,v_mode,'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=500',true,NOW()-INTERVAL '1 day',NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,'Bordeaux','M',10,32000),(gen_random_uuid(),v_a,'Bordeaux','L',8,32000),(gen_random_uuid(),v_a,'Bordeaux','XL',4,32000),(gen_random_uuid(),v_a,'Bleu foncé','L',6,32000);

v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Ensemble Pagne 3 pièces','Ensemble tailleur pagne : veste, jupe et foulard assortis.',78000,65000,true,17,true,v_b2,v_mode,'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500',true,NOW()-INTERVAL '2 days',NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,'Vert/Or','S',5,78000),(gen_random_uuid(),v_a,'Vert/Or','M',8,78000),(gen_random_uuid(),v_a,'Vert/Or','L',4,78000);

v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Sac à main Raphia','Sac artisanal en fibre de raphia tressé, 100% naturel.',22000,0,false,0,true,v_b2,v_mode,'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500',true,NOW()-INTERVAL '3 days',NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,'Naturel',NULL,20,22000),(gen_random_uuid(),v_a,'Teint marron',NULL,15,22000);

v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Sneakers Nike Air Max 270','Légères et confortables, semelle Air Max visible.',95000,80000,true,16,false,v_b2,v_sport,'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',true,NOW()-INTERVAL '1 day',NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,'Blanc/Rouge','40',5,95000),(gen_random_uuid(),v_a,'Blanc/Rouge','42',8,95000),(gen_random_uuid(),v_a,'Blanc/Rouge','44',3,95000),(gen_random_uuid(),v_a,'Noir','42',6,95000);

v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Jogging Adidas Homme','Survêtement coton/polyester, coupe slim, séchage rapide.',48000,42000,true,13,false,v_b2,v_sport,'https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=500',true,NOW()-INTERVAL '2 days',NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,'Noir','M',10,48000),(gen_random_uuid(),v_a,'Noir','L',8,48000),(gen_random_uuid(),v_a,'Marine','M',6,48000);

-- ============================================================
-- 6. ARTICLES — BOUTIQUE 3 : Beauté & Maison (Cosméto & Maison)
-- ============================================================

-- Cosmétiques
v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Huile de Coco Vierge 500ml','Huile pure extraite à froid, idéale visage, corps et cheveux.',8500,0,false,0,true,v_b3,v_cosme,'https://images.unsplash.com/photo-1547592180-85f173990554?w=500',true,NOW(),NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,NULL,'500ml',50,8500),(gen_random_uuid(),v_a,NULL,'1L',30,15000);

v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Crème Karité Corps','Crème hydratante au beurre de karité pur, parfum floral.',6500,5500,true,15,true,v_b3,v_cosme,'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=500',true,NOW()-INTERVAL '1 day',NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,NULL,'200ml',40,6500),(gen_random_uuid(),v_a,NULL,'400ml',25,11000);

v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Savon Noir Beldi','Savon traditionnel africain à l''huile d''argan, 200g.',3500,0,false,0,true,v_b3,v_cosme,'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500',true,NOW()-INTERVAL '2 days',NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,NULL,'200g',80,3500);

v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Parfum Oud Royal 50ml','Eau de parfum oriental, notes de bois d''oud et ambre.',45000,38000,true,16,false,v_b3,v_cosme,'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=500',true,NOW()-INTERVAL '3 days',NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,NULL,'50ml',20,45000),(gen_random_uuid(),v_a,NULL,'100ml',12,75000);

-- Maison
v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Canapé 3 places Velours','Canapé moderne en velours, structure bois massif.',380000,320000,true,16,false,v_b3,v_maison,'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500',true,NOW()-INTERVAL '1 day',NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,'Vert forêt',NULL,3,380000),(gen_random_uuid(),v_a,'Gris anthracite',NULL,4,380000),(gen_random_uuid(),v_a,'Bleu canard',NULL,2,380000);

v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Machine à laver Samsung 8kg','Lave-linge frontal 8kg, A+++, vapeur anti-bactériens.',320000,290000,true,9,false,v_b3,v_maison,'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500',true,NOW()-INTERVAL '2 days',NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,'Blanc',NULL,5,320000);

v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Ventilateur de Table 40cm','3 vitesses, oscillation automatique, silencieux.',18500,0,false,0,false,v_b3,v_maison,'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500',true,NOW()-INTERVAL '3 days',NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,'Blanc',NULL,25,18500),(gen_random_uuid(),v_a,'Noir',NULL,18,18500);

v_a := gen_random_uuid();
INSERT INTO articles VALUES (v_a,'Set Bougies Parfumées x6','6 bougies en cire naturelle, senteurs tropicales variées.',12000,9500,true,21,true,v_b3,v_maison,'https://images.unsplash.com/photo-1608181831718-f5e89625e9d4?w=500',true,NOW()-INTERVAL '4 days',NOW());
INSERT INTO variations (id,article_id,couleur,taille,stock,prix) VALUES (gen_random_uuid(),v_a,'Multicolore',NULL,40,12000);

-- ============================================================
-- 7. PUBLICITÉS (avec user_id pour badge boutique)
-- ============================================================
INSERT INTO publicites (id, date_start, date_end, titre, url_image, lien, description, is_actif, user_id, created_at, updated_at)
VALUES
  (gen_random_uuid(),'2026-04-01','2026-06-30','Soldes Tech – Jusqu''à -20%',
   'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200',
   '/articlesAll','Offres exceptionnelles sur smartphones et laptops !',true,v_b1,NOW(),NOW()),
  (gen_random_uuid(),'2026-04-10','2026-05-10','Nouvelle Collection Wax 2026',
   'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1200',
   '/articlesAll','Mode africaine wax et batik — Tendance & authentique.',true,v_b2,NOW(),NOW()),
  (gen_random_uuid(),'2026-04-15','2026-07-15','Soins Naturels Made in Gabon',
   'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=1200',
   '/articlesAll','Cosmétiques 100% naturels fabriqués au Gabon.',true,v_b3,NOW(),NOW()),
  (gen_random_uuid(),'2026-05-01','2026-05-31','Livraison Offerte dès 50 000 FCFA',
   'https://images.unsplash.com/photo-1602526219050-2cc8302d91b3?w=1200',
   '/articlesAll','Commandez et profitez de la livraison gratuite à Libreville.',true,NULL,NOW(),NOW());

-- ============================================================
-- 8. COMMANDES (client1 : 3 commandes, client2 : 1)
-- ============================================================
v_c := gen_random_uuid();
INSERT INTO commandes (id,user_id,statut,total,adresse_livraison,telephone,created_at,updated_at)
VALUES (v_c,v_client1,'En attente',950000,'Quartier Louis, Libreville','+24177100001',NOW()-INTERVAL '1 day',NOW());
INSERT INTO commande_articles (id,commande_id,article_id,quantite,prix_unitaire)
SELECT gen_random_uuid(),v_c,id,1,950000 FROM articles WHERE nom='iPhone 15 128GB' LIMIT 1;

v_c := gen_random_uuid();
INSERT INTO commandes (id,user_id,statut,total,adresse_livraison,telephone,created_at,updated_at)
VALUES (v_c,v_client1,'Confirmée',83000,'Libreville Centre','+24177100001',NOW()-INTERVAL '5 days',NOW()-INTERVAL '4 days');
INSERT INTO commande_articles (id,commande_id,article_id,quantite,prix_unitaire)
SELECT gen_random_uuid(),v_c,id,1,38000 FROM articles WHERE nom='Robe Wax Africaine Longue' LIMIT 1;
INSERT INTO commande_articles (id,commande_id,article_id,quantite,prix_unitaire)
SELECT gen_random_uuid(),v_c,id,1,45000 FROM articles WHERE nom='Huile de Coco Vierge 500ml' LIMIT 1;

v_c := gen_random_uuid();
INSERT INTO commandes (id,user_id,statut,total,adresse_livraison,telephone,created_at,updated_at)
VALUES (v_c,v_client1,'Livrée',240000,'Owendo, Libreville','+24177100001',NOW()-INTERVAL '15 days',NOW()-INTERVAL '10 days');
INSERT INTO commande_articles (id,commande_id,article_id,quantite,prix_unitaire)
SELECT gen_random_uuid(),v_c,id,1,240000 FROM articles WHERE nom='Écouteurs Sony WH-1000XM5' LIMIT 1;

v_c := gen_random_uuid();
INSERT INTO commandes (id,user_id,statut,total,adresse_livraison,telephone,created_at,updated_at)
VALUES (v_c,v_client2,'En cours',650000,'Akanda, Libreville','+24177100002',NOW()-INTERVAL '2 days',NOW());
INSERT INTO commande_articles (id,commande_id,article_id,quantite,prix_unitaire)
SELECT gen_random_uuid(),v_c,id,1,650000 FROM articles WHERE nom='Laptop HP Pavilion 15' LIMIT 1;

-- ============================================================
-- 9. FAVORIS (client1)
-- ============================================================
INSERT INTO favoris (id,user_id,article_id,created_at)
SELECT gen_random_uuid(),v_client1,id,NOW()
FROM articles WHERE nom IN ('iPhone 15 128GB','Robe Wax Africaine Longue','Crème Karité Corps','Sneakers Nike Air Max 270');

-- ============================================================
-- 10. NOTIFICATIONS
-- ============================================================
INSERT INTO notifications (id,user_id,type,titre,message,is_read,created_at)
VALUES
  (gen_random_uuid(),v_client1,'commande', 'Commande confirmée',     'Votre commande #001 a été confirmée.',               false,NOW()-INTERVAL '1 hour'),
  (gen_random_uuid(),v_client1,'livraison','Livraison en cours',      'Votre colis est en route vers Libreville.',          false,NOW()-INTERVAL '3 hours'),
  (gen_random_uuid(),v_client1,'promo',    'Promo TechGabon !',       '-20% sur tous les smartphones cette semaine.',       true, NOW()-INTERVAL '1 day'),
  (gen_random_uuid(),v_client1,'commande', 'Commande livrée',         'Votre commande des écouteurs Sony est livrée. 🎉',   true, NOW()-INTERVAL '10 days'),
  (gen_random_uuid(),v_client2,'commande', 'Commande en préparation', 'Votre Laptop HP est en cours de préparation.',       false,NOW()-INTERVAL '2 hours');

-- ============================================================
-- 11. RÉCLAMATIONS
-- ============================================================
INSERT INTO reclamations (id,user_id,description,phone,statut,created_at,updated_at)
VALUES
  (gen_random_uuid(),v_client1,'Mon colis est arrivé endommagé, le boîtier du téléphone est fissuré.','+24177100001','En attente de traitement',NOW()-INTERVAL '3 days',NOW()),
  (gen_random_uuid(),v_client1,'La robe commandée ne correspond pas à la taille indiquée sur le site.','+24177100001','En cours de traitement',  NOW()-INTERVAL '8 days',NOW()-INTERVAL '5 days');

RAISE NOTICE '✅ Seed terminé !';
RAISE NOTICE '';
RAISE NOTICE '📧 Comptes (mot de passe : Test1234!)';
RAISE NOTICE '   client1@test.com    → Client (Alice)';
RAISE NOTICE '   client2@test.com    → Client (Bob)';
RAISE NOTICE '   boutique1@test.com  → TechGabon Store  (7 articles : Électronique + Sport)';
RAISE NOTICE '   boutique2@test.com  → Mode Gabonaise   (6 articles : Mode + Sport)';
RAISE NOTICE '   boutique3@test.com  → Beauté & Maison  (8 articles : Cosmétiques + Maison)';
RAISE NOTICE '   livreur1@test.com   → Livreur';
RAISE NOTICE '';
RAISE NOTICE '📦 21 articles au total, 5 catégories, 4 pubs, 4 commandes';

END $$;
