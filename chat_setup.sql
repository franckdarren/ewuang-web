-- ============================================================
--  SYSTÈME DE CHAT SÉCURISÉ — Étape 1 : Base de données
-- ============================================================
--  À exécuter dans l'éditeur SQL de Supabase.
--  Script idempotent (ré-exécutable sans erreur).
--
--  Modèle :
--    chat_threads  : un fil de discussion entre 2 participants
--    chat_messages : les messages d'un fil
--
--  Sécurité :
--    - RLS : seuls les 2 participants peuvent LIRE le fil/les messages
--      (essentiel pour l'abonnement Realtime côté navigateur).
--    - Les écritures passent par le backend (service_role) comme
--      pour les réclamations ; politiques INSERT = défense en profondeur.
--    - L'admin n'accède PAS aux fils Client↔Boutique (non-participant).
-- ============================================================


-- ============================================================
-- 1) TABLE chat_threads
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type                  VARCHAR(32) NOT NULL
        CHECK (type IN (
            'client_boutique',
            'boutique_admin',
            'client_admin',
            'livreur_boutique',
            'livreur_admin'
        )),
    participant_a_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    participant_b_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    commande_id           UUID REFERENCES public.commandes(id) ON DELETE SET NULL,
    reclamation_id        UUID REFERENCES public.reclamations(id) ON DELETE SET NULL,
    last_message_at       TIMESTAMPTZ,
    last_message_preview  VARCHAR(255),
    unread_count_a        INTEGER NOT NULL DEFAULT 0,
    unread_count_b        INTEGER NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Empêche un fil avec soi-même
    CONSTRAINT chat_threads_distinct_participants
        CHECK (participant_a_id <> participant_b_id)
);

-- Unicité d'un fil pour un même couple + (commande/réclamation) éventuels.
-- COALESCE vers un UUID sentinelle car NULL n'est pas pris en compte
-- dans une contrainte UNIQUE classique.
CREATE UNIQUE INDEX IF NOT EXISTS chat_threads_unique_pair
    ON public.chat_threads (
        participant_a_id,
        participant_b_id,
        COALESCE(commande_id,    '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(reclamation_id, '00000000-0000-0000-0000-000000000000'::uuid)
    );

CREATE INDEX IF NOT EXISTS chat_threads_participant_a_idx ON public.chat_threads (participant_a_id);
CREATE INDEX IF NOT EXISTS chat_threads_participant_b_idx ON public.chat_threads (participant_b_id);
CREATE INDEX IF NOT EXISTS chat_threads_last_message_idx  ON public.chat_threads (last_message_at DESC);
CREATE INDEX IF NOT EXISTS chat_threads_commande_idx      ON public.chat_threads (commande_id);
CREATE INDEX IF NOT EXISTS chat_threads_reclamation_idx   ON public.chat_threads (reclamation_id);


-- ============================================================
-- 2) TABLE chat_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id   UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    sender_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    contenu     TEXT,
    image_url   VARCHAR(512),
    is_read     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Un message doit avoir au moins du texte OU une image
    CONSTRAINT chat_messages_not_empty CHECK (
        (contenu IS NOT NULL AND length(trim(contenu)) > 0)
        OR image_url IS NOT NULL
    ),
    -- Garde-fou anti-abus : longueur max du texte
    CONSTRAINT chat_messages_max_len CHECK (
        contenu IS NULL OR length(contenu) <= 4000
    )
);

CREATE INDEX IF NOT EXISTS chat_messages_thread_idx
    ON public.chat_messages (thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_sender_idx
    ON public.chat_messages (sender_id);
CREATE INDEX IF NOT EXISTS chat_messages_unread_idx
    ON public.chat_messages (thread_id, is_read);


-- ============================================================
-- 3) HELPER : id applicatif de l'utilisateur courant
--    Mappe auth.uid() (Supabase Auth) -> users.id
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;


-- ============================================================
-- 4) TRIGGER : maintien du fil à chaque nouveau message
--    (aperçu, date, compteurs non-lus du destinataire)
-- ============================================================
CREATE OR REPLACE FUNCTION public.chat_after_message_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    t public.chat_threads;
BEGIN
    SELECT * INTO t FROM public.chat_threads WHERE id = NEW.thread_id FOR UPDATE;

    UPDATE public.chat_threads
    SET last_message_at      = NEW.created_at,
        last_message_preview = left(
            COALESCE(NULLIF(trim(NEW.contenu), ''), '📷 Image'), 255
        ),
        updated_at           = now(),
        -- Si l'expéditeur est B, alors A a un nouveau message non lu (+1 sur A)
        unread_count_a = unread_count_a
            + (CASE WHEN NEW.sender_id = t.participant_b_id THEN 1 ELSE 0 END),
        unread_count_b = unread_count_b
            + (CASE WHEN NEW.sender_id = t.participant_a_id THEN 1 ELSE 0 END)
    WHERE id = NEW.thread_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_after_message_insert ON public.chat_messages;
CREATE TRIGGER trg_chat_after_message_insert
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW EXECUTE FUNCTION public.chat_after_message_insert();


-- ============================================================
-- 5) ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.chat_threads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ---- chat_threads : lecture réservée aux 2 participants ----
DROP POLICY IF EXISTS "chat_threads_select_participants" ON public.chat_threads;
CREATE POLICY "chat_threads_select_participants"
    ON public.chat_threads
    FOR SELECT
    TO authenticated
    USING (
        participant_a_id = public.current_app_user_id()
        OR participant_b_id = public.current_app_user_id()
    );

-- Défense en profondeur : si jamais une écriture passe en clé anon,
-- l'utilisateur doit être l'un des participants.
DROP POLICY IF EXISTS "chat_threads_insert_participants" ON public.chat_threads;
CREATE POLICY "chat_threads_insert_participants"
    ON public.chat_threads
    FOR INSERT
    TO authenticated
    WITH CHECK (
        participant_a_id = public.current_app_user_id()
        OR participant_b_id = public.current_app_user_id()
    );

DROP POLICY IF EXISTS "chat_threads_update_participants" ON public.chat_threads;
CREATE POLICY "chat_threads_update_participants"
    ON public.chat_threads
    FOR UPDATE
    TO authenticated
    USING (
        participant_a_id = public.current_app_user_id()
        OR participant_b_id = public.current_app_user_id()
    );

-- ---- chat_messages : lecture/écriture réservées aux participants du fil ----
DROP POLICY IF EXISTS "chat_messages_select_participants" ON public.chat_messages;
CREATE POLICY "chat_messages_select_participants"
    ON public.chat_messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_threads th
            WHERE th.id = chat_messages.thread_id
              AND (
                  th.participant_a_id = public.current_app_user_id()
                  OR th.participant_b_id = public.current_app_user_id()
              )
        )
    );

DROP POLICY IF EXISTS "chat_messages_insert_sender" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_sender"
    ON public.chat_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = public.current_app_user_id()
        AND EXISTS (
            SELECT 1 FROM public.chat_threads th
            WHERE th.id = chat_messages.thread_id
              AND (
                  th.participant_a_id = public.current_app_user_id()
                  OR th.participant_b_id = public.current_app_user_id()
              )
        )
    );

DROP POLICY IF EXISTS "chat_messages_update_participants" ON public.chat_messages;
CREATE POLICY "chat_messages_update_participants"
    ON public.chat_messages
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_threads th
            WHERE th.id = chat_messages.thread_id
              AND (
                  th.participant_a_id = public.current_app_user_id()
                  OR th.participant_b_id = public.current_app_user_id()
              )
        )
    );


-- ============================================================
-- 6) REALTIME : diffusion des nouveaux messages / maj des fils
-- ============================================================
-- Replica identity FULL : nécessaire pour recevoir l'ancienne valeur
-- lors des UPDATE (compteurs non-lus du fil).
ALTER TABLE public.chat_threads  REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Ajout à la publication Realtime (ignore l'erreur si déjà présent).
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;


-- ============================================================
-- 7) STORAGE : bucket privé 'chat-images'
-- ============================================================
-- Privé volontairement : les images de discussion ne sont
-- accessibles que via URL signée générée côté serveur (service_role).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-images',
    'chat-images',
    false,                                   -- PRIVÉ
    5242880,                                 -- 5 Mo max
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Upload autorisé aux utilisateurs authentifiés (le backend valide
-- l'appartenance au fil avant d'écrire le message correspondant).
DROP POLICY IF EXISTS "Allow authenticated uploads to chat-images" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to chat-images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'chat-images');

-- Pas de politique de lecture publique : l'accès se fait par URL signée.

DROP POLICY IF EXISTS "Allow authenticated deletes from chat-images" ON storage.objects;
CREATE POLICY "Allow authenticated deletes from chat-images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'chat-images');


-- ============================================================
-- FIN — Étape 1
-- ============================================================
-- Vérifications rapides après exécution :
--   select * from public.chat_threads;        -- table vide créée
--   select * from public.chat_messages;       -- table vide créée
--   select public.current_app_user_id();      -- doit renvoyer votre users.id
-- ============================================================
