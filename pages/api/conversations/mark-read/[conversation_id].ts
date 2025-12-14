import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/conversations/mark-read/{conversation_id}:
 *   patch:
 *     summary: Marque les messages comme lus
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH")
        return res.status(405).json({ error: "Méthode non autorisée" });

    const { conversation_id } = req.query;

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const { error } = await supabaseAdmin
            .from("conversations")
            .update({ is_read: true })
            .eq("sender_id", conversation_id as string)
            .eq("receiver_id", profile.id)
            .eq("is_read", false);

        if (error) {
            console.error("Erreur marquage lu:", error);
            return res.status(500).json({ error: "Erreur lors de la mise à jour" });
        }

        return res.status(200).json({ message: "Messages marqués comme lus" });
    } catch (err) {
        console.error("Error /api/conversations/mark-read:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
