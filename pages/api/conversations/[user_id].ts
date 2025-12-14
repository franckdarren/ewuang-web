import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/conversations/{user_id}:
 *   get:
 *     summary: Récupère la conversation avec un utilisateur
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET")
        return res.status(405).json({ error: "Méthode non autorisée" });

    const { user_id } = req.query;

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        // Vérifier l'autre utilisateur
        const { data: autreUser, error: userErr } = await supabaseAdmin
            .from("users")
            .select("id, name, email, url_logo, role")
            .eq("id", user_id as string)
            .single();

        if (userErr || !autreUser) {
            return res.status(404).json({ error: "Utilisateur introuvable" });
        }

        // Récupérer les messages
        const { data: messages, error } = await supabaseAdmin
            .from("conversations")
            .select(`
        *,
        sender:users!sender_id(id, name, url_logo),
        receiver:users!receiver_id(id, name, url_logo)
        `)
            .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${user_id}),and(sender_id.eq.${user_id},receiver_id.eq.${profile.id})`)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Erreur récupération messages:", error);
            return res.status(500).json({ error: "Erreur lors de la récupération" });
        }

        // Marquer comme lus
        await supabaseAdmin
            .from("conversations")
            .update({ is_read: true })
            .eq("sender_id", user_id as string)
            .eq("receiver_id", profile.id)
            .eq("is_read", false);

        return res.status(200).json({
            interlocuteur: autreUser,
            messages: messages || [],
            total: messages?.length || 0
        });
    } catch (err) {
        console.error("Error /api/conversations/[user_id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
