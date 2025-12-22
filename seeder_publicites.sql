INSERT INTO publicites (
        id,
        date_start,
        date_end,
        titre,
        url_image,
        lien,
        description,
        is_actif,
        created_at,
        updated_at
    )
VALUES -- 1. Promo smartphone
    (
        uuid_generate_v4(),
        '2025-12-01',
        '2026-01-10',
        'Promo iPhone 15 – réduction exceptionnelle',
        'https://images.unsplash.com/photo-1696446702183-cbd80a1c2e0d?w=800',
        'https://example.com/offres/iphone15',
        'Profitez d''une réduction exclusive sur l''iPhone 15 pour les fêtes.',
        true,
        now(),
        now()
    ),
    -- 2. Nouvelle collection mode
    (
        uuid_generate_v4(),
        '2025-11-15',
        '2025-12-31',
        'Nouvelle collection Mode – Saison Hiver',
        'https://images.pexels.com/photos/2983464/pexels-photo-2983464.jpeg',
        'https://example.com/mode/hiver',
        'Découvrez notre nouvelle collection hiver avec des pièces tendance.',
        true,
        now(),
        now()
    ),
    -- 3. Livraison gratuite
    (
        uuid_generate_v4(),
        '2025-10-01',
        '2025-12-31',
        'Livraison gratuite sur tout le site',
        'https://images.unsplash.com/photo-1602526219050-2cc8302d91b3?w=800',
        'https://example.com/livraison-gratuite',
        'Commandez maintenant et profitez de la livraison gratuite !',
        true,
        now(),
        now()
    ),
    -- 4. Vente flash électronique
    (
        uuid_generate_v4(),
        '2025-12-10',
        '2025-12-13',
        'Vente Flash – Électronique',
        'https://cdn.pixabay.com/photo/2017/01/22/19/20/electronics-2002360_1280.jpg',
        'https://example.com/vente-flash',
        'Offres limitées sur tous les produits électroniques.',
        true,
        now(),
        now()
    ),
    -- 5. Promotion chaussures
    (
        uuid_generate_v4(),
        '2025-11-20',
        '2026-02-01',
        'Promo Chaussures – Jusqu''à -60%',
        'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg',
        'https://example.com/chaussures-promo',
        'Grandes réductions sur notre sélection de chaussures.',
        true,
        now(),
        now()
    ),
    -- 6. Promotion Noël
    (
        uuid_generate_v4(),
        '2025-12-01',
        '2025-12-26',
        '🎄 Offres Spéciales Noël',
        'https://images.unsplash.com/photo-1608153674043-ff322d7ce414?w=800',
        'https://example.com/noel',
        'Cadeaux et réductions spéciales pour Noël !',
        true,
        now(),
        now()
    ),
    -- 7. Publicité vidéo (miniature + lien vidéo)
    (
        uuid_generate_v4(),
        '2025-12-05',
        '2026-01-05',
        'Vidéo – Lancement de la Nouvelle Collection',
        'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        'https://youtu.be/dQw4w9WgXcQ',
        'Regardez notre vidéo de lancement de collection maintenant.',
        true,
        now(),
        now()
    ),
    -- 8. Offre meubles
    (
        uuid_generate_v4(),
        '2025-11-01',
        '2026-01-15',
        'Promo Meubles – Jusqu''à 50%',
        'https://cdn.pixabay.com/photo/2016/11/19/14/00/furniture-1839241_1280.jpg',
        'https://example.com/meubles-offre',
        'Meubles design en promo pour une durée limitée.',
        true,
        now(),
        now()
    ),
    -- 9. Offre accessoires tech
    (
        uuid_generate_v4(),
        '2025-12-01',
        '2026-02-01',
        'Accessoires Tech – Soldes de Saison',
        'https://images.pexels.com/photos/5082578/pexels-photo-5082578.jpeg',
        'https://example.com/accessoires-tech',
        'Découvrez nos accessoires tech à petits prix.',
        true,
        now(),
        now()
    ),
    -- 10. Promo sport & fitness
    (
        uuid_generate_v4(),
        '2025-12-10',
        '2026-01-20',
        'Sport & Fitness – Nouveautés en Promo',
        'https://cdn.pixabay.com/photo/2016/11/29/03/53/fitness-1868886_1280.jpg',
        'https://example.com/sport-fitness',
        'Équipez-vous pour vos objectifs fitness avec nos promos.',
        true,
        now(),
        now()
    );