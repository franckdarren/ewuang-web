import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/panier/remove/{item_id}:
 *   delete:
 *     summary: Retire un item du panier
 *     tags:
 *       - Panier
 *     security:
 *       - bearerAuth: []
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "DELETE")
        return res.status(405).json({ error: "Méthode non autorisée" });

    const { item_id } = req.query;

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        // Vérifier que l'item appartient à l'utilisateur
        const { data: item } = await supabaseAdmin
            .from("panier_items")
            .select(`
        id,
        paniers!inner(user_id)
        `)
            .eq("id", item_id as string)
            .eq("paniers.user_id", profile.id)
            .single();

        if (!item) {
            return res.status(404).json({ error: "Item introuvable" });
        }

        const { error: deleteErr } = await supabaseAdmin
            .from("panier_items")
            .delete()
            .eq("id", item_id as string);

        if (deleteErr) {
            console.error("Erreur suppression:", deleteErr);
            return res.status(500).json({ error: "Erreur lors de la suppression" });
        }

        return res.status(200).json({ message: "Article retiré du panier" });
    } catch (err) {
        console.error("Error /api/panier/remove/[item_id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}