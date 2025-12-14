import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/conversations/unread:
 *   get:
 *     summary: Compte les messages non lus
 *     tags:
 *       - Conversations
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

        const { count, error } = await supabaseAdmin
            .from("conversations")
            .select("*", { count: 'exact', head: true })
            .eq("receiver_id", profile.id)
            .eq("is_read", false);

        if (error) {
            console.error("Erreur comptage messages:", error);
            return res.status(500).json({ error: "Erreur lors du comptage" });
        }

        return res.status(200).json({ unread_count: count || 0 });
    } catch (err) {
        console.error("Error /api/conversations/unread:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
