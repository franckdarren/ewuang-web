// pages/api/chat/unread.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/chat/unread:
 *   get:
 *     summary: Nombre total de messages non lus (badge de navigation)
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "{ total: number }" }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    const auth = await requireUserAuth(req, res);
    if (!auth) return;
    const { profile } = auth;

    const { data: threads, error } = await supabaseAdmin
        .from("chat_threads")
        .select("participant_a_id, participant_b_id, unread_count_a, unread_count_b")
        .or(`participant_a_id.eq.${profile.id},participant_b_id.eq.${profile.id}`);

    if (error) {
        console.error("Erreur compteur non-lus chat:", error);
        return res.status(500).json({ error: "Erreur serveur" });
    }

    const total = (threads ?? []).reduce((sum, t) => {
        if (t.participant_a_id === profile.id) return sum + (t.unread_count_a || 0);
        if (t.participant_b_id === profile.id) return sum + (t.unread_count_b || 0);
        return sum;
    }, 0);

    return res.status(200).json({ total });
}
