import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   patch:
 *     summary: Marque toutes les notifications comme lues
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const { error } = await supabaseAdmin
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", profile.id)
            .eq("is_read", false);

        if (error) {
            console.error("Erreur marquage toutes lues:", error);
            return res.status(500).json({ error: "Erreur lors de la mise à jour" });
        }

        return res.status(200).json({ message: "Toutes les notifications marquées comme lues" });
    } catch (err) {
        console.error("Error /api/notifications/mark-all-read:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
