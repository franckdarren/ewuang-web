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

-- 2bis) Créer le bucket 'articles-videos' (vidéo promotionnelle optionnelle, une par article)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'articles-videos',
    'articles-videos',
    true, -- Bucket public, comme articles-images
    52428800, -- 50 MB max
    ARRAY['video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- 2ter) Créer le bucket 'avatars' (photo de profil, une par utilisateur)
-- NB : l'API /api/upload/avatar le crée aussi automatiquement au 1er upload
-- (client service-role). Ce bloc sert de référence / setup manuel.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true, -- Bucket public (URLs d'avatar accessibles partout)
    5242880, -- 5 MB max
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
-- Politiques RLS pour 'articles-videos'
-- ============================================

-- 10bis-1) Autoriser les uploads pour les utilisateurs authentifiés
CREATE POLICY "Allow authenticated uploads to articles-videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'articles-videos');

-- 10bis-2) Autoriser la lecture publique
CREATE POLICY "Allow public read access to articles-videos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'articles-videos');

-- 10bis-3) Autoriser les updates pour les propriétaires
CREATE POLICY "Allow authenticated updates to articles-videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'articles-videos')
WITH CHECK (bucket_id = 'articles-videos');

-- 10bis-4) Autoriser les suppressions pour les propriétaires
CREATE POLICY "Allow authenticated deletes from articles-videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'articles-videos');

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
-- Bucket et politiques RLS pour 'avis-images'
-- ============================================

-- 16) Créer le bucket 'avis-images' (si n'existe pas déjà)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avis-images',
    'avis-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 17) Autoriser les uploads pour les utilisateurs authentifiés
CREATE POLICY "Allow authenticated uploads to avis-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avis-images');

-- 18) Autoriser la lecture publique
CREATE POLICY "Allow public read access to avis-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avis-images');

-- 19) Autoriser les updates pour les utilisateurs authentifiés
CREATE POLICY "Allow authenticated updates to avis-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avis-images')
WITH CHECK (bucket_id = 'avis-images');

-- 20) Autoriser les suppressions pour les utilisateurs authentifiés
CREATE POLICY "Allow authenticated deletes from avis-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avis-images');

-- ============================================
-- Bucket et politiques RLS pour 'avatars'
-- ============================================

-- 21) Créer le bucket 'avatars' (si n'existe pas déjà)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 22) Autoriser les uploads pour les utilisateurs authentifiés
CREATE POLICY "Allow authenticated uploads to avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- 23) Autoriser la lecture publique
CREATE POLICY "Allow public read access to avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 24) Autoriser les updates pour les utilisateurs authentifiés
CREATE POLICY "Allow authenticated updates to avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- 25) Autoriser les suppressions pour les utilisateurs authentifiés
CREATE POLICY "Allow authenticated deletes from avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

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
