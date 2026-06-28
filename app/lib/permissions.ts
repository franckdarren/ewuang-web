// app/lib/permissions.ts
/**
 * RBAC admin — résolution et vérification des permissions.
 *
 * Modèle (cf. add_admin_rbac_tables.sql) :
 *   users.admin_role_id → admin_roles → role_permissions → permissions
 *
 * Le rôle « Super Admin » (admin_roles.is_system = true) est traité comme un
 * joker : il possède implicitement TOUTES les permissions, y compris celles des
 * modules ajoutés plus tard. On le représente par la constante WILDCARD ('*').
 *
 * Ces helpers ne s'appliquent qu'aux comptes users.role = 'Administrateur'. Pour
 * les autres rôles (Client/Boutique/Livreur), getPermissions renvoie un set vide.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "./supabaseAdmin";
import { requireUserAuth } from "./middlewares/requireUserAuth";

export const WILDCARD = "*" as const;

/** Profil minimal nécessaire à la résolution des permissions. */
type ProfileLike = {
    id: string;
    role: string;
    admin_role_id?: string | null;
};

export type AdminRoleInfo = {
    id: string;
    nom: string;
    is_system: boolean;
};

export type PermissionSet = typeof WILDCARD | Set<string>;

export type AdminContext = {
    role: AdminRoleInfo | null;
    /** '*' pour un Super Admin, sinon l'ensemble des clés `module.action`. */
    permissions: PermissionSet;
};

/**
 * Résout le rôle admin et l'ensemble des permissions d'un profil.
 * - Non-admin ou admin sans rôle affecté → { role: null, permissions: Set() }
 * - Rôle système (Super Admin) → permissions = '*'
 * - Sinon → Set des clés accordées
 */
export async function getAdminContext(profile: ProfileLike): Promise<AdminContext> {
    if (profile.role !== "Administrateur" || !profile.admin_role_id) {
        return { role: null, permissions: new Set<string>() };
    }

    const { data, error } = await supabaseAdmin
        .from("admin_roles")
        .select("id, nom, is_system, role_permissions(permission_cle)")
        .eq("id", profile.admin_role_id)
        .maybeSingle();

    if (error) {
        console.error("[getAdminContext] Erreur select admin_roles:", error);
    }

    if (!data) {
        return { role: null, permissions: new Set<string>() };
    }

    const role: AdminRoleInfo = { id: data.id, nom: data.nom, is_system: data.is_system };

    if (data.is_system) {
        return { role, permissions: WILDCARD };
    }

    const rows = (data.role_permissions ?? []) as { permission_cle: string }[];
    return { role, permissions: new Set(rows.map((r) => r.permission_cle)) };
}

/** Renvoie uniquement l'ensemble des permissions d'un profil. */
export async function getPermissions(profile: ProfileLike): Promise<PermissionSet> {
    return (await getAdminContext(profile)).permissions;
}

/** Vérifie qu'un ensemble de permissions couvre la clé demandée. */
export function hasPermission(permissions: PermissionSet, cle: string): boolean {
    return permissions === WILDCARD || permissions.has(cle);
}

/** Ne conserve que les clés de permission présentes dans le catalogue. */
export async function getValidPermissionKeys(cles: string[]): Promise<string[]> {
    const uniques = [...new Set(cles)];
    if (uniques.length === 0) return [];

    const { data } = await supabaseAdmin
        .from("permissions")
        .select("cle")
        .in("cle", uniques);

    return (data ?? []).map((p) => p.cle);
}

/** Sérialise un PermissionSet en tableau (pour les réponses JSON / le front). */
export function serializePermissions(permissions: PermissionSet): string[] {
    return permissions === WILDCARD ? [WILDCARD] : [...permissions];
}

type RequirePermissionResult = NonNullable<Awaited<ReturnType<typeof requireUserAuth>>> & {
    adminRole: AdminRoleInfo | null;
    permissions: PermissionSet;
};

/**
 * Middleware de route : exige une authentification, le rôle Administrateur ET
 * la permission `cle` (ex: 'articles.write'). Renvoie le contexte enrichi, ou
 * null après avoir répondu 401/403 (le handler appelant doit alors `return`).
 */
export async function requirePermission(
    req: NextApiRequest,
    res: NextApiResponse,
    cle: string
): Promise<RequirePermissionResult | null> {
    const auth = await requireUserAuth(req, res);
    if (!auth) return null;

    const { profile } = auth;

    if (profile.role !== "Administrateur") {
        res.status(403).json({ error: "Accès interdit. Droits administrateur requis." });
        return null;
    }

    const { role, permissions } = await getAdminContext(profile);

    if (!hasPermission(permissions, cle)) {
        res.status(403).json({ error: "Accès interdit : permission insuffisante." });
        return null;
    }

    return { ...auth, adminRole: role, permissions };
}
