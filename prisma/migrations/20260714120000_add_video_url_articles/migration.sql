-- Ajoute la colonne video_url sur articles pour la vidéo promotionnelle optionnelle.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS video_url varchar(500);
