-- ============================================================
-- Activation du Realtime Supabase pour la table notifications
-- À exécuter une seule fois dans l'éditeur SQL de Supabase
-- ============================================================

-- 1. Activer REPLICA IDENTITY FULL pour recevoir les anciennes valeurs lors des UPDATE
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 2. Ajouter la table à la publication Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 3. Activer RLS si ce n'est pas déjà fait
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Politique : chaque utilisateur ne voit que ses propres notifications
--    (nécessaire pour que le client browser avec la clé anon puisse recevoir les events Realtime)
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());
