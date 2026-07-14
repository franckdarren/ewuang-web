-- =====================================================================
-- Refonte commandes multi-boutiques — Livraison groupée
-- À exécuter dans le SQL Editor Supabase, APRÈS phase1 et phase3.
-- Objectif : relier les livraisons sœurs d'une même commande_groupe pour
-- permettre l'attribution automatique du même livreur à toutes les
-- sous-commandes (boutiques) d'une commande groupée.
-- Idempotent : ne backfill que les lignes encore sans groupe_id.
-- =====================================================================

-- 1. Rattacher chaque livraison au groupe parent de sa commande.
alter table livraisons add column if not exists groupe_id uuid references commande_groupes(id);
create index if not exists idx_livraisons_groupe_id on livraisons(groupe_id);

-- 2. Backfill des livraisons existantes à partir de la commande liée.
--    (Après la phase3, commandes.groupe_id est renseigné pour toutes les
--     commandes, y compris les anciennes mono-boutique.)
update livraisons l
set groupe_id = c.groupe_id
from commandes c
where c.id = l.commande_id
  and l.groupe_id is null;

-- 3. Contrôle (à lancer manuellement après coup) :
-- select count(*) as livraisons_sans_groupe from livraisons where groupe_id is null;
