-- ============================================
-- Configuration des buckets Supabase Storage
-- ============================================

-- 1) Créer le bucket 'articles-images' (si n'existe pas déjà)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'articles-images',
    'articles-images',
    true, -- Bucket public (pour que les URLs soient accessibles)
    5242880, -- 5 MB max
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2) Créer le bucket 'variations-images' (si n'existe pas déjà)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'variations-images',
    'variations-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Politiques RLS pour 'articles-images'
-- ============================================

-- 3) Autoriser les uploads pour les utilisateurs authentifiés
CREATE POLICY "Allow authenticated uploads to articles-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'articles-images');

-- 4) Autoriser la lecture publique
CREATE POLICY "Allow public read access to articles-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'articles-images');

-- 5) Autoriser les updates pour les propriétaires
CREATE POLICY "Allow authenticated updates to articles-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'articles-images')
WITH CHECK (bucket_id = 'articles-images');

-- 6) Autoriser les suppressions pour les propriétaires
CREATE POLICY "Allow authenticated deletes from articles-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'articles-images');

-- ============================================
-- Politiques RLS pour 'variations-images'
-- ============================================

-- 7) Autoriser les uploads pour les utilisateurs authentifiés
CREATE POLICY "Allow authenticated uploads to variations-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'variations-images');

-- 8) Autoriser la lecture publique
CREATE POLICY "Allow public read access to variations-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'variations-images');

-- 9) Autoriser les updates pour les propriétaires
CREATE POLICY "Allow authenticated updates to variations-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'variations-images')
WITH CHECK (bucket_id = 'variations-images');

-- 10) Autoriser les suppressions pour les propriétaires
CREATE POLICY "Allow authenticated deletes from variations-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'variations-images');

-- ============================================
-- Bucket et politiques RLS pour 'categories-images'
-- ============================================

-- 11) Créer le bucket 'categories-images' (si n'existe pas déjà)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'categories-images',
    'categories-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 12) Autoriser les uploads pour les utilisateurs authentifiés
CREATE POLICY "Allow authenticated uploads to categories-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'categories-images');

-- 13) Autoriser la lecture publique
CREATE POLICY "Allow public read access to categories-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'categories-images');

-- 14) Autoriser les updates pour les utilisateurs authentifiés
CREATE POLICY "Allow authenticated updates to categories-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'categories-images')
WITH CHECK (bucket_id = 'categories-images');

-- 15) Autoriser les suppressions pour les utilisateurs authentifiés
CREATE POLICY "Allow authenticated deletes from categories-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'categories-images');

-- ============================================
-- NOTES
-- ============================================
--
-- - Les buckets sont publics pour que les URLs d'images soient accessibles
-- - Les utilisateurs authentifiés peuvent uploader, modifier et supprimer
-- - Tout le monde peut lire les images
--
-- Pour plus de sécurité, vous pouvez ajouter des conditions supplémentaires,
-- par exemple vérifier que l'utilisateur a le rôle 'vendeur' :
--
-- WITH CHECK (
--     bucket_id = 'articles-images' AND
--     (SELECT role FROM users WHERE id = auth.uid()) = 'vendeur'
-- );
