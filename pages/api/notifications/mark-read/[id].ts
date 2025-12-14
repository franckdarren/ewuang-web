import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/notifications/mark-read/{id}:
 *   patch:
 *     summary: Marque une notification comme lue
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH")
        return res.status(405).json({ error: "Méthode non autorisée" });

    const { id } = req.query;

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        // Vérifier que la notification appartient à l'utilisateur
        const { data: notification } = await supabaseAdmin
            .from("notifications")
            .select("id")
            .eq("id", id as string)
            .eq("user_id", profile.id)
            .single();

        if (!notification) {
            return res.status(404).json({ error: "Notification introuvable" });
        }

        const { error: updateErr } = await supabaseAdmin
            .from("notifications")
            .update({ is_read: true })
            .eq("id", id as string);

        if (updateErr) {
            console.error("Erreur marquage lu:", updateErr);
            return res.status(500).json({ error: "Erreur lors de la mise à jour" });
        }

        return res.status(200).json({ message: "Notification marquée comme lue" });
    } catch (err) {
        console.error("Error /api/notifications/mark-read:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
