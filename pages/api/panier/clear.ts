import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/panier/clear:
 *   delete:
 *     summary: Vide complètement le panier
 *     tags:
 *       - Panier
 *     security:
 *       - bearerAuth: []
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "DELETE")
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
            return res.status(200).json({ message: "Panier déjà vide" });
        }

        const { error: deleteErr } = await supabaseAdmin
            .from("panier_items")
            .delete()
            .eq("panier_id", panier.id);

        if (deleteErr) {
            console.error("Erreur vidage panier:", deleteErr);
            return res.status(500).json({ error: "Erreur lors du vidage" });
        }

        return res.status(200).json({ message: "Panier vidé avec succès" });
    } catch (err) {
        console.error("Error /api/panier/clear:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}