import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/conversations/list:
 *   get:
 *     summary: Liste toutes les conversations de l'utilisateur
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des conversations
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        // Récupérer toutes les conversations
        const { data: conversations, error } = await supabaseAdmin
            .from("conversations")
            .select(`
        *,
        sender:users!sender_id(id, name, email, url_logo, role),
        receiver:users!receiver_id(id, name, email, url_logo, role)
      `)
            .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Erreur récupération conversations:", error);
            return res.status(500).json({ error: "Erreur lors de la récupération" });
        }

        // Grouper par interlocuteur
        const conversationsMap = new Map();

        conversations?.forEach(conv => {
            const interlocuteur = conv.sender_id === profile.id
                ? conv.receiver
                : conv.sender;

            const interlocuteurId = interlocuteur.id;

            if (!conversationsMap.has(interlocuteurId)) {
                conversationsMap.set(interlocuteurId, {
                    interlocuteur,
                    dernier_message: conv,
                    messages_non_lus: 0,
                });
            }

            // Compter non lus
            if (conv.receiver_id === profile.id && !conv.is_read) {
                conversationsMap.get(interlocuteurId).messages_non_lus++;
            }
        });

        const liste = Array.from(conversationsMap.values());

        return res.status(200).json({ conversations: liste, total: liste.length });
    } catch (err) {
        console.error("Error /api/conversations/list:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
