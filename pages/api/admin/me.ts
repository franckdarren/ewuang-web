import type { NextApiRequest, NextApiResponse } from "next";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";
import { getAdminContext, serializePermissions } from "../../../app/lib/permissions";

/**
 * @swagger
 * /api/admin/me:
 *   get:
 *     summary: Rôle admin et permissions de l'utilisateur courant
 *     description: >
 *       Renvoie le rôle admin (RBAC) et la liste des permissions de l'utilisateur
 *       connecté. Pour un Super Admin, permissions vaut ["*"].
 *     tags:
 *       - Admin RBAC
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Contexte admin de l'utilisateur }
 *       401: { description: Non autorisé }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;

        const { role, permissions } = await getAdminContext(auth.profile);

        return res.status(200).json({
            role: auth.profile.role,
            admin_role: role,
            permissions: serializePermissions(permissions),
        });
    } catch (err) {
        console.error("Error /api/admin/me:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
