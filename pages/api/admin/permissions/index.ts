import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requirePermission } from "../../../../app/lib/permissions";

/**
 * @swagger
 * /api/admin/permissions:
 *   get:
 *     summary: Catalogue des permissions disponibles
 *     description: Liste toutes les permissions `module.action` connues du système.
 *     tags:
 *       - Admin RBAC
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Liste des permissions }
 *       403: { description: Permission insuffisante (roles.read requise) }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    const auth = await requirePermission(req, res, "roles.read");
    if (!auth) return;

    try {
        const { data, error } = await supabaseAdmin
            .from("permissions")
            .select("cle, module, action, libelle")
            .order("module", { ascending: true })
            .order("action", { ascending: true });

        if (error) {
            console.error("Erreur select permissions:", error);
            return res.status(500).json({ error: "Impossible de charger les permissions" });
        }

        return res.status(200).json({ permissions: data ?? [] });
    } catch (err) {
        console.error("Error /api/admin/permissions:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
