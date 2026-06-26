-- Migration : push FCM sur l'escalade automatique des remboursements
-- À exécuter dans le SQL Editor Supabase, APRÈS sql/remboursements.sql.
--
-- Problème : le job pg_cron exécutait `escalader_remboursements_sans_reponse()`
-- directement en base → les notifications (rappels J-1 + escalades) étaient
-- insérées dans `notifications`, mais AUCUN push FCM n'était déclenché
-- (Postgres ne peut pas appeler Firebase).
--
-- Vercel Hobby (gratuit) ne permet pas de Cron Job horaire (1/jour max), donc
-- on garde pg_cron côté Supabase MAIS on le fait appeler l'endpoint HTTP
-- /api/remboursements/cron/escalader via l'extension pg_net. Cet endpoint
-- exécute le même RPC PUIS pousse en FCM les notifs fraîchement créées.
--
-- ⚠️ AVANT D'EXÉCUTER :
--   1. Cette même valeur CRON_SECRET doit être ajoutée côté Vercel
--      (Project Settings → Environment Variables → CRON_SECRET), sinon
--      l'endpoint rejettera l'appel du cron avec un 401.
--   2. Vérifier l'URL de production (ici https://ewuang.vercel.app).

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Re-planifie le job : remplace l'exécution SQL directe par un appel HTTP.
-- net.http_post est asynchrone (fire-and-forget) — parfait pour un cron.
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'escalader-remboursements';

  PERFORM cron.schedule(
    'escalader-remboursements',
    '10 * * * *',
    $cron$
    SELECT net.http_post(
      url     := 'https://ewuang.vercel.app/api/remboursements/cron/escalader',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer 28ed4c3be0caf5ef4f3c81fecc5f1fc12cfcb2eeff97d72ef27b81a632eed5d3'
      )
    );
    $cron$
  );
END $$;

-- Vérification : la commande du job doit désormais contenir net.http_post.
-- SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'escalader-remboursements';
