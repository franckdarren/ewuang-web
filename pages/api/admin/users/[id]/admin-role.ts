import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../../app/lib/supabaseAdmin";
import { requirePermission } from "../../../../../app/lib/permissions";

/**
 * @swagger
 * /api/admin/users/{id}/admin-role:
 *   patch:
 *     summary: Affecte (ou retire) un rôle admin à un utilisateur
 *     description: >
 *       Définit users.admin_role_id pour un compte de rôle Administrateur.
 *       Envoyer admin_role_id = null pour retirer toute permission.
 *     tags: [Admin RBAC]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Rôle affecté }
 *       400: { description: Données invalides }
 *       403: { description: Permission insuffisante (roles.manage requise) }
 *       404: { description: Utilisateur ou rôle introuvable }
 */

const schema = z.object({
    admin_role_id: z.string().uuid().nullable(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    const auth = await requirePermission(req, res, "roles.manage");
    if (!auth) return;

    const { id } = req.query;
    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Identifiant utilisateur invalide" });
    }

    try {
        const { admin_role_id } = schema.parse(req.body);

        // Garde anti-verrouillage : un admin ne modifie pas son propre rôle ici.
        if (id === auth.profile.id) {
            return res.status(403).json({ error: "Vous ne pouvez pas modifier votre propre rôle" });
        }

        // L'utilisateur cible doit exister et être un Administrateur.
        const { data: target, error: targetErr } = await supabaseAdmin
            .from("users")
            .select("id, role")
            .eq("id", id)
            .maybeSingle();

        if (targetErr) {
            console.error("Erreur select user cible:", targetErr);
            return res.status(500).json({ error: "Erreur serveur interne" });
        }
        if (!target) {
            return res.status(404).json({ error: "Utilisateur introuvable" });
        }
        if (target.role !== "Administrateur") {
            return res.status(400).json({ error: "Seuls les comptes Administrateur peuvent recevoir un rôle admin" });
        }

        // Si un rôle est fourni, vérifier qu'il existe.
        if (admin_role_id) {
            const { data: role } = await supabaseAdmin
                .from("admin_roles")
                .select("id")
                .eq("id", admin_role_id)
                .maybeSingle();
            if (!role) {
                return res.status(404).json({ error: "Rôle introuvable" });
            }
        }

        const { data: updated, error: updErr } = await supabaseAdmin
            .from("users")
            .update({ admin_role_id, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select("id, name, email, role, admin_role_id")
            .single();

        if (updErr) {
            console.error("Erreur update admin_role_id:", updErr);
            return res.status(500).json({ error: "Impossible d'affecter le rôle" });
        }

        return res.status(200).json({ user: updated });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
            });
        }
        console.error("Error PATCH /api/admin/users/[id]/admin-role:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
