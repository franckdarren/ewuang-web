import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requirePermission } from "../../../app/lib/permissions";

/**
 * @swagger
 * /api/admin/admins:
 *   get:
 *     summary: Liste des comptes Administrateur et leur rôle admin
 *     description: Liste légère (id, nom, email, logo, admin_role_id) des comptes role = Administrateur, pour l'affectation des rôles RBAC.
 *     tags: [Admin RBAC]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Liste des administrateurs }
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
            .from("users")
            .select("id, name, email, url_logo, admin_role_id")
            .eq("role", "Administrateur")
            .order("name", { ascending: true });

        if (error) {
            console.error("Erreur select admins:", error);
            return res.status(500).json({ error: "Impossible de charger les administrateurs" });
        }

        return res.status(200).json({ admins: data ?? [] });
    } catch (err) {
        console.error("Error /api/admin/admins:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
