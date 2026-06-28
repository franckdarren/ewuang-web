-- Migration : système de rôles & permissions pour les administrateurs (RBAC)
-- À exécuter dans l'éditeur SQL Supabase
--
-- Concept : la colonne users.role (Client | Boutique | Livreur | Administrateur)
-- ne change PAS — le middleware et l'app Flutter continuent de fonctionner à
-- l'identique. On ajoute PAR-DESSUS, pour les comptes « Administrateur », une
-- notion de « rôle admin » (admin_roles) qui porte un ensemble de permissions
-- fines au format `module.action` (ex: 'articles.write', 'transactions.read').
--
-- Un rôle système « Super Admin » (is_system = true) possède toutes les
-- permissions et n'est ni modifiable ni supprimable. En code, ce rôle est
-- traité comme un joker ('*') : il aura automatiquement accès aux modules
-- ajoutés ultérieurement, sans réattribution.
--
-- Migration des données : tous les comptes Administrateur existants sont
-- rattachés à « Super Admin » → personne ne perd l'accès. On redistribue
-- ensuite les rôles plus restreints depuis l'interface /dashboard/roles.

-- 1️⃣ Table des rôles admin
CREATE TABLE IF NOT EXISTS admin_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  -- Rôle système (Super Admin) : non modifiable / non supprimable depuis l'UI.
  is_system   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2️⃣ Catalogue des permissions (clés stables référencées par le code).
-- `module` et `action` sont stockés en colonnes pour faciliter le regroupement
-- dans la matrice de l'UI (modules en lignes × actions en colonnes).
CREATE TABLE IF NOT EXISTS permissions (
  cle     VARCHAR(100) PRIMARY KEY,  -- ex: 'articles.write'
  module  VARCHAR(50)  NOT NULL,     -- ex: 'articles'
  action  VARCHAR(20)  NOT NULL,     -- read | write | delete | manage
  libelle VARCHAR(150) NOT NULL      -- libellé FR affiché dans l'UI
);

-- 3️⃣ Jointure rôle ↔ permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id        UUID         NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  permission_cle VARCHAR(100) NOT NULL REFERENCES permissions(cle) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_cle)
);

CREATE INDEX IF NOT EXISTS role_permissions_role_id_idx ON role_permissions (role_id);

-- 4️⃣ Lien user → rôle admin (NULL pour les non-admins et les admins non encore
-- affectés). ON DELETE SET NULL : supprimer un rôle ne supprime pas le compte.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS admin_role_id UUID REFERENCES admin_roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS users_admin_role_id_idx ON users (admin_role_id);

-- 5️⃣ Trigger updated_at sur admin_roles
CREATE OR REPLACE FUNCTION set_admin_roles_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_roles_updated_at ON admin_roles;
CREATE TRIGGER trg_admin_roles_updated_at
  BEFORE UPDATE ON admin_roles
  FOR EACH ROW EXECUTE FUNCTION set_admin_roles_updated_at();

-- 6️⃣ Seed du catalogue de permissions.
-- Actions : read = Consulter, write = Gérer (créer/modifier), delete = Supprimer,
-- manage = Administrer (réservé au module « roles »).
INSERT INTO permissions (cle, module, action, libelle) VALUES
  ('stats.read',                'stats',              'read',   'Tableau de bord — Consulter'),

  ('articles.read',            'articles',           'read',   'Articles — Consulter'),
  ('articles.write',           'articles',           'write',  'Articles — Gérer'),
  ('articles.delete',          'articles',           'delete', 'Articles — Supprimer'),

  ('users.read',               'users',              'read',   'Utilisateurs — Consulter'),
  ('users.write',              'users',              'write',  'Utilisateurs — Gérer'),
  ('users.delete',             'users',              'delete', 'Utilisateurs — Supprimer'),

  ('commandes.read',           'commandes',          'read',   'Commandes — Consulter'),
  ('commandes.write',          'commandes',          'write',  'Commandes — Gérer'),
  ('commandes.delete',         'commandes',          'delete', 'Commandes — Supprimer'),

  ('publicites.read',          'publicites',         'read',   'Publicités — Consulter'),
  ('publicites.write',         'publicites',         'write',  'Publicités — Gérer'),
  ('publicites.delete',        'publicites',         'delete', 'Publicités — Supprimer'),

  ('publicites_premium.read',  'publicites_premium', 'read',   'Publicités Premium — Consulter'),
  ('publicites_premium.write', 'publicites_premium', 'write',  'Publicités Premium — Gérer'),
  ('publicites_premium.delete','publicites_premium', 'delete', 'Publicités Premium — Supprimer'),

  ('reclamations.read',        'reclamations',       'read',   'Réclamations — Consulter'),
  ('reclamations.write',       'reclamations',       'write',  'Réclamations — Gérer'),
  ('reclamations.delete',      'reclamations',       'delete', 'Réclamations — Supprimer'),

  ('remboursements.read',      'remboursements',     'read',   'Remboursements — Consulter'),
  ('remboursements.write',     'remboursements',     'write',  'Remboursements — Gérer'),

  ('livraisons.read',          'livraisons',         'read',   'Livraisons — Consulter'),
  ('livraisons.write',         'livraisons',         'write',  'Livraisons — Gérer'),
  ('livraisons.delete',        'livraisons',         'delete', 'Livraisons — Supprimer'),

  ('zones_livraison.read',     'zones_livraison',    'read',   'Zones de livraison — Consulter'),
  ('zones_livraison.write',    'zones_livraison',    'write',  'Zones de livraison — Gérer'),
  ('zones_livraison.delete',   'zones_livraison',    'delete', 'Zones de livraison — Supprimer'),

  ('transactions.read',        'transactions',       'read',   'Transactions — Consulter'),
  ('transactions.write',       'transactions',       'write',  'Transactions — Gérer'),

  ('notifications.read',       'notifications',      'read',   'Notifications — Consulter'),
  ('notifications.write',      'notifications',      'write',  'Notifications — Gérer'),
  ('notifications.delete',     'notifications',      'delete', 'Notifications — Supprimer'),

  ('messages.read',            'messages',           'read',   'Messages — Consulter'),
  ('messages.write',           'messages',           'write',  'Messages — Gérer'),

  ('categories.read',          'categories',         'read',   'Catégories — Consulter'),
  ('categories.write',         'categories',         'write',  'Catégories — Gérer'),
  ('categories.delete',        'categories',         'delete', 'Catégories — Supprimer'),

  ('boutiques.read',           'boutiques',          'read',   'Boutiques — Consulter'),
  ('boutiques.write',          'boutiques',          'write',  'Boutiques — Gérer'),

  ('roles.read',               'roles',              'read',   'Rôles & permissions — Consulter'),
  ('roles.manage',             'roles',              'manage', 'Rôles & permissions — Administrer')
ON CONFLICT (cle) DO UPDATE
  SET module = EXCLUDED.module, action = EXCLUDED.action, libelle = EXCLUDED.libelle;

-- 7️⃣ Rôle système « Super Admin » + toutes les permissions.
INSERT INTO admin_roles (nom, description, is_system)
VALUES ('Super Admin', 'Accès total à toutes les fonctionnalités. Rôle système, non modifiable et non supprimable.', true)
ON CONFLICT (nom) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_cle)
SELECT r.id, p.cle
FROM admin_roles r
CROSS JOIN permissions p
WHERE r.nom = 'Super Admin'
ON CONFLICT DO NOTHING;

-- 8️⃣ Migration des données : tous les Administrateur existants → Super Admin.
-- Idempotent (ne réaffecte pas ceux qui ont déjà un rôle).
UPDATE users
SET admin_role_id = (SELECT id FROM admin_roles WHERE nom = 'Super Admin')
WHERE role = 'Administrateur' AND admin_role_id IS NULL;

-- 9️⃣ RLS — accès via service_role uniquement (les API Next.js utilisent
-- supabaseAdmin). Les utilisateurs finaux n'accèdent jamais à ces tables
-- directement depuis le client.
ALTER TABLE admin_roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_roles_service_role_all" ON admin_roles;
CREATE POLICY "admin_roles_service_role_all" ON admin_roles
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "permissions_service_role_all" ON permissions;
CREATE POLICY "permissions_service_role_all" ON permissions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "role_permissions_service_role_all" ON role_permissions;
CREATE POLICY "role_permissions_service_role_all" ON role_permissions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE admin_roles IS
  'Rôles administratifs (RBAC) appliqués aux comptes users.role = Administrateur. Super Admin (is_system) = accès total.';
COMMENT ON TABLE permissions IS
  'Catalogue des permissions fines module.action référencées par le code et l''UI.';
COMMENT ON TABLE role_permissions IS
  'Permissions accordées à chaque rôle admin.';
COMMENT ON COLUMN users.admin_role_id IS
  'Rôle admin (RBAC) du compte. Pertinent uniquement quand role = Administrateur.';
