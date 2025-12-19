INSERT INTO categories (
        nom,
        slug,
        description,
        image,
        parent_id,
        is_active,
        ordre,
        created_at,
        updated_at
    )
SELECT *
FROM (
        VALUES (
                'Vêtements Homme',
                'mode-vetements-homme',
                'Chemises, pantalons, t-shirts',
                'homme.png',
                1
            ),
            (
                'Vêtements Femme',
                'mode-vetements-femme',
                'Robes, jupes, hauts',
                'femme.png',
                2
            ),
            (
                'Vêtements Enfant',
                'mode-vetements-enfant',
                'Habits pour enfants',
                'enfant.png',
                3
            ),
            (
                'Chaussures',
                'mode-chaussures',
                'Chaussures homme, femme et enfant',
                'chaussures.png',
                4
            ),
            (
                'Sacs & Maroquinerie',
                'mode-sacs',
                'Sacs, portefeuilles',
                'sacs.png',
                5
            ),
            (
                'Bijoux & Montres',
                'mode-bijoux-montres',
                'Montres, colliers, bracelets',
                'bijoux.png',
                6
            )
    ) AS s(nom, slug, description, image, ordre)
    CROSS JOIN (
        SELECT id
        FROM categories
        WHERE slug = 'mode'
    ) p(id)
SELECT nom,
    slug,
    description,
    image,
    p.id,
    true,
    ordre,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP;