import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/notifications/delete/{id}:
 *   delete:
 *     summary: Supprime une notification
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "DELETE")
        return res.status(405).json({ error: "Méthode non autorisée" });

    const { id } = req.query;

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        // Vérifier appartenance
        const { data: notification } = await supabaseAdmin
            .from("notifications")
            .select("id")
            .eq("id", id as string)
            .eq("user_id", profile.id)
            .single();

        if (!notification) {
            return res.status(404).json({ error: "Notification introuvable" });
        }

        const { error: deleteErr } = await supabaseAdmin
            .from("notifications")
            .delete()
            .eq("id", id as string);

        if (deleteErr) {
            console.error("Erreur suppression:", deleteErr);
            return res.status(500).json({ error: "Erreur lors de la suppression" });
        }

        return res.status(200).json({ message: "Notification supprimée" });
    } catch (err) {
        console.error("Error /api/notifications/delete:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
