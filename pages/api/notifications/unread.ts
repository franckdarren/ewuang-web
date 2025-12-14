import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/notifications/unread:
 *   get:
 *     summary: Récupère les notifications non lues
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const { data: notifications, error } = await supabaseAdmin
            .from("notifications")
            .select("*")
            .eq("user_id", profile.id)
            .eq("is_read", false)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Erreur récupération notifications:", error);
            return res.status(500).json({ error: "Erreur lors de la récupération" });
        }

        return res.status(200).json({
            notifications: notifications || [],
            total: notifications?.length || 0
        });
    } catch (err) {
        console.error("Error /api/notifications/unread:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}