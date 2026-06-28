import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requirePermission, getValidPermissionKeys } from "../../../../app/lib/permissions";

/**
 * @swagger
 * /api/admin/roles/{id}:
 *   get:
 *     summary: Détail d'un rôle admin
 *     tags: [Admin RBAC]
 *     security: [{ bearerAuth: [] }]
 *   patch:
 *     summary: Met à jour un rôle admin (nom, description, permissions)
 *     tags: [Admin RBAC]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Supprime un rôle admin
 *     tags: [Admin RBAC]
 *     security: [{ bearerAuth: [] }]
 */

const updateSchema = z.object({
    nom: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    permissions: z.array(z.string()).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Identifiant de rôle invalide" });
    }

    if (req.method === "GET") return getRole(req, res, id);
    if (req.method === "PATCH") return updateRole(req, res, id);
    if (req.method === "DELETE") return deleteRole(req, res, id);
    return res.status(405).json({ error: "Méthode non autorisée" });
}

async function getRole(req: NextApiRequest, res: NextApiResponse, id: string) {
    const auth = await requirePermission(req, res, "roles.read");
    if (!auth) return;

    const { data, error } = await supabaseAdmin
        .from("admin_roles")
        .select("id, nom, description, is_system, created_at, updated_at, role_permissions(permission_cle)")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error("Erreur select rôle:", error);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
    if (!data) {
        return res.status(404).json({ error: "Rôle introuvable" });
    }

    const perms = (data.role_permissions ?? []) as { permission_cle: string }[];
    return res.status(200).json({
        role: {
            id: data.id,
            nom: data.nom,
            description: data.description,
            is_system: data.is_system,
            created_at: data.created_at,
            updated_at: data.updated_at,
            permissions: perms.map((p) => p.permission_cle),
        },
    });
}

async function updateRole(req: NextApiRequest, res: NextApiResponse, id: string) {
    const auth = await requirePermission(req, res, "roles.manage");
    if (!auth) return;

    try {
        const body = updateSchema.parse(req.body);

        const { data: role, error: fetchErr } = await supabaseAdmin
            .from("admin_roles")
            .select("id, is_system")
            .eq("id", id)
            .maybeSingle();

        if (fetchErr) {
            console.error("Erreur select rôle:", fetchErr);
            return res.status(500).json({ error: "Erreur serveur interne" });
        }
        if (!role) {
            return res.status(404).json({ error: "Rôle introuvable" });
        }
        if (role.is_system) {
            return res.status(403).json({ error: "Le rôle système ne peut pas être modifié" });
        }

        // Mise à jour des champs simples
        const updateData: Record<string, unknown> = {};
        if (body.nom !== undefined) {
            const nom = body.nom.trim();
            // Unicité (insensible à la casse), en excluant le rôle courant
            const { data: dup } = await supabaseAdmin
                .from("admin_roles")
                .select("id")
                .ilike("nom", nom)
                .neq("id", id)
                .maybeSingle();
            if (dup) {
                return res.status(400).json({ error: "Un rôle portant ce nom existe déjà" });
            }
            updateData.nom = nom;
        }
        if (body.description !== undefined) updateData.description = body.description ?? null;

        if (Object.keys(updateData).length > 0) {
            const { error: updErr } = await supabaseAdmin
                .from("admin_roles")
                .update(updateData)
                .eq("id", id);
            if (updErr) {
                console.error("Erreur update rôle:", updErr);
                return res.status(500).json({ error: "Impossible de mettre à jour le rôle" });
            }
        }

        // Remplacement complet de l'ensemble des permissions si fourni
        if (body.permissions !== undefined) {
            const valides = await getValidPermissionKeys(body.permissions);

            const { error: delErr } = await supabaseAdmin
                .from("role_permissions")
                .delete()
                .eq("role_id", id);
            if (delErr) {
                console.error("Erreur purge permissions:", delErr);
                return res.status(500).json({ error: "Impossible de mettre à jour les permissions" });
            }

            if (valides.length > 0) {
                const { error: insErr } = await supabaseAdmin
                    .from("role_permissions")
                    .insert(valides.map((cle) => ({ role_id: id, permission_cle: cle })));
                if (insErr) {
                    console.error("Erreur insert permissions:", insErr);
                    return res.status(500).json({ error: "Impossible d'enregistrer les permissions" });
                }
            }
        }

        return getRole(req, res, id);
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
            });
        }
        console.error("Error PATCH /api/admin/roles/[id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}

async function deleteRole(req: NextApiRequest, res: NextApiResponse, id: string) {
    const auth = await requirePermission(req, res, "roles.manage");
    if (!auth) return;

    const { data: role, error: fetchErr } = await supabaseAdmin
        .from("admin_roles")
        .select("id, is_system")
        .eq("id", id)
        .maybeSingle();

    if (fetchErr) {
        console.error("Erreur select rôle:", fetchErr);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
    if (!role) {
        return res.status(404).json({ error: "Rôle introuvable" });
    }
    if (role.is_system) {
        return res.status(403).json({ error: "Le rôle système ne peut pas être supprimé" });
    }

    // Les admins rattachés voient leur admin_role_id passer à NULL (ON DELETE SET NULL).
    const { error: delErr } = await supabaseAdmin.from("admin_roles").delete().eq("id", id);
    if (delErr) {
        console.error("Erreur suppression rôle:", delErr);
        return res.status(500).json({ error: "Impossible de supprimer le rôle" });
    }

    return res.status(200).json({ message: "Rôle supprimé" });
}
