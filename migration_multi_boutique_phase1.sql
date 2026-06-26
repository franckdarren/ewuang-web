-- =====================================================================
-- Refonte commandes multi-boutiques — PHASE 1 (socle DB)
-- À exécuter dans le SQL Editor Supabase.
-- Objectif : 1 sous-commande par boutique, regroupées sous un "groupe
-- parent" que le client paie en une fois (frais de livraison unique).
-- =====================================================================

-- 1. Table groupe parent : ce que le client voit et paie en une seule fois.
create table if not exists commande_groupes (
  id                  uuid primary key default gen_random_uuid(),
  numero              varchar(255) not null,            -- numéro parent (ex: E-260626-001)
  user_id             uuid not null references users(id),
  paiement_id         uuid references paiements(id),
  prix_total          int  not null,                    -- somme sous-commandes + frais_livraison - remise
  frais_livraison     int  not null default 0,          -- UNIQUE pour tout le panier
  ville_livraison     varchar(255),
  adresse_livraison   varchar(255) not null,
  telephone_livraison varchar(255),
  commentaire         varchar(255) default '',
  code_promo_id       uuid references codes_promo(id) on delete set null,
  remise_appliquee    int  not null default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists idx_commande_groupes_user_id     on commande_groupes(user_id);
create index if not exists idx_commande_groupes_paiement_id on commande_groupes(paiement_id);

-- 2. Rattacher chaque commande (= sous-commande d'une boutique) à son groupe.
alter table commandes add column if not exists groupe_id uuid references commande_groupes(id);
create index if not exists idx_commandes_groupe_id on commandes(groupe_id);

-- 3. Lever l'unicité de paiement_id : N sous-commandes partagent 1 paiement.
--    (Le nom de contrainte par défaut généré par Prisma est commandes_paiement_id_key.)
alter table commandes drop constraint if exists commandes_paiement_id_key;
