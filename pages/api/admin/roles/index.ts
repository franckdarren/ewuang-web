import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requirePermission, getValidPermissionKeys } from "../../../../app/lib/permissions";

/**
 * @swagger
 * /api/admin/roles:
 *   get:
 *     summary: Liste des rôles admin (RBAC)
 *     tags: [Admin RBAC]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Liste des rôles avec nb de permissions et d'admins }
 *   post:
 *     summary: Crée un rôle admin
 *     tags: [Admin RBAC]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Rôle créé }
 *       400: { description: Données invalides ou nom déjà utilisé }
 *       403: { description: Permission insuffisante (roles.manage requise) }
 */

const createSchema = z.object({
    nom: z.string().trim().min(2, "Le nom doit faire au moins 2 caractères").max(100),
    description: z.string().trim().max(2000).optional().nullable(),
    permissions: z.array(z.string()).default([]),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "GET") return listRoles(req, res);
    if (req.method === "POST") return createRole(req, res);
    return res.status(405).json({ error: "Méthode non autorisée" });
}

async function listRoles(req: NextApiRequest, res: NextApiResponse) {
    const auth = await requirePermission(req, res, "roles.read");
    if (!auth) return;

    try {
        const { data: roles, error } = await supabaseAdmin
            .from("admin_roles")
            .select("id, nom, description, is_system, created_at, updated_at, role_permissions(permission_cle)")
            .order("is_system", { ascending: false })
            .order("nom", { ascending: true });

        if (error) {
            console.error("Erreur select admin_roles:", error);
            return res.status(500).json({ error: "Impossible de charger les rôles" });
        }

        // Nombre d'admins par rôle (peu de comptes → un seul select suffit)
        const { data: admins } = await supabaseAdmin
            .from("users")
            .select("admin_role_id")
            .eq("role", "Administrateur")
            .not("admin_role_id", "is", null);

        const usersByRole = new Map<string, number>();
        for (const a of admins ?? []) {
            if (a.admin_role_id) usersByRole.set(a.admin_role_id, (usersByRole.get(a.admin_role_id) ?? 0) + 1);
        }

        const result = (roles ?? []).map((r) => {
            const perms = (r.role_permissions ?? []) as { permission_cle: string }[];
            return {
                id: r.id,
                nom: r.nom,
                description: r.description,
                is_system: r.is_system,
                created_at: r.created_at,
                updated_at: r.updated_at,
                permissions: perms.map((p) => p.permission_cle),
                permissions_count: perms.length,
                users_count: usersByRole.get(r.id) ?? 0,
            };
        });

        return res.status(200).json({ roles: result });
    } catch (err) {
        console.error("Error GET /api/admin/roles:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}

async function createRole(req: NextApiRequest, res: NextApiResponse) {
    const auth = await requirePermission(req, res, "roles.manage");
    if (!auth) return;

    try {
        const body = createSchema.parse(req.body);
        const nom = body.nom.trim();

        // Unicité (insensible à la casse)
        const { data: existing } = await supabaseAdmin
            .from("admin_roles")
            .select("id")
            .ilike("nom", nom)
            .maybeSingle();

        if (existing) {
            return res.status(400).json({ error: "Un rôle portant ce nom existe déjà" });
        }

        // Valider les permissions contre le catalogue
        const valides = await getValidPermissionKeys(body.permissions);

        const { data: role, error: insertErr } = await supabaseAdmin
            .from("admin_roles")
            .insert({ nom, description: body.description ?? null, is_system: false })
            .select("id, nom, description, is_system, created_at, updated_at")
            .single();

        if (insertErr || !role) {
            console.error("Erreur création rôle:", insertErr);
            return res.status(500).json({ error: "Impossible de créer le rôle" });
        }

        if (valides.length > 0) {
            const { error: linkErr } = await supabaseAdmin
                .from("role_permissions")
                .insert(valides.map((cle) => ({ role_id: role.id, permission_cle: cle })));
            if (linkErr) {
                console.error("Erreur liaison permissions:", linkErr);
                // On supprime le rôle créé pour éviter un état incohérent
                await supabaseAdmin.from("admin_roles").delete().eq("id", role.id);
                return res.status(500).json({ error: "Impossible d'enregistrer les permissions du rôle" });
            }
        }

        return res.status(201).json({ role: { ...role, permissions: valides } });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
            });
        }
        console.error("Error POST /api/admin/roles:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
