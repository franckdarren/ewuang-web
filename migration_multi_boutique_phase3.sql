-- =====================================================================
-- Refonte commandes multi-boutiques — PHASE 3 (migration des données)
-- À exécuter dans le SQL Editor Supabase, APRÈS la phase 1.
-- Idempotent : ne traite que les commandes encore sans groupe.
-- =====================================================================

-- 1. Backfill vendeur_id pour les commandes MONO-boutique sans vendeur.
--    (Les commandes historiques multi-boutiques restent vendeur_id = NULL ;
--     elles sont gérées par le repli "propriété des articles" côté API.)
update commandes c
set vendeur_id = sub.boutique
from (
  select ca.commande_id,
         min(a.user_id::text)::uuid as boutique,
         count(distinct a.user_id)   as n
  from commande_articles ca
  join articles a on a.id = ca.article_id
  group by ca.commande_id
) sub
where sub.commande_id = c.id
  and c.vendeur_id is null
  and sub.n = 1;

-- 2. Créer un groupe parent rétroactif (1 commande = 1 groupe) pour chaque
--    commande encore orpheline, et la rattacher.
do $$
declare
  c   record;
  gid uuid;
begin
  for c in select * from commandes where groupe_id is null loop
    insert into commande_groupes (
      numero, user_id, paiement_id, prix_total, frais_livraison,
      adresse_livraison, telephone_livraison, commentaire, created_at, updated_at
    )
    values (
      c.numero, c.user_id, c.paiement_id, c.prix, 0,
      c.adresse_livraison, c.telephone_livraison, coalesce(c.commentaire, ''),
      c.created_at, now()
    )
    returning id into gid;

    update commandes set groupe_id = gid where id = c.id;
  end loop;
end $$;

-- 3. Contrôle : il ne doit plus rester de commande sans groupe.
-- select count(*) as commandes_sans_groupe from commandes where groupe_id is null;
