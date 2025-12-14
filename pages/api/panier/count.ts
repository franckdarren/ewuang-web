import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/panier/count:
 *   get:
 *     summary: Compte les items du panier
 *     tags:
 *       - Panier
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

        const { data: panier } = await supabaseAdmin
            .from("paniers")
            .select("id")
            .eq("user_id", profile.id)
            .single();

        if (!panier) {
            return res.status(200).json({ items_count: 0, total_quantite: 0 });
        }

        const { data: items } = await supabaseAdmin
            .from("panier_items")
            .select("quantite")
            .eq("panier_id", panier.id);

        const count = items?.length || 0;
        const totalQuantite = items?.reduce((sum, item) => sum + item.quantite, 0) || 0;

        return res.status(200).json({ items_count: count, total_quantite: totalQuantite });
    } catch (err) {
        console.error("Error /api/panier/count:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}