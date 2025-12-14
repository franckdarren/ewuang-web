import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/conversations/delete/{id}:
 *   delete:
 *     summary: Supprime un message
 *     tags:
 *       - Conversations
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

        // Vérifier que le message appartient à l'utilisateur
        const { data: message } = await supabaseAdmin
            .from("conversations")
            .select("id")
            .eq("id", id as string)
            .eq("sender_id", profile.id)
            .single();

        if (!message) {
            return res.status(404).json({ error: "Message introuvable" });
        }

        const { error: deleteErr } = await supabaseAdmin
            .from("conversations")
            .delete()
            .eq("id", id as string);

        if (deleteErr) {
            console.error("Erreur suppression message:", deleteErr);
            return res.status(500).json({ error: "Erreur lors de la suppression" });
        }

        return res.status(200).json({ message: "Message supprimé" });
    } catch (err) {
        console.error("Error /api/conversations/delete:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}