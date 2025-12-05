// pages/api/articles/promotions.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/articles/promotions:
 *   get:
 *     summary: Récupère les articles en promotion
 *     description: Retourne les articles où is_promotion = true (ou prix_promotion non null).
 *     tags: [Articles]
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });
    try {
        const { data, error } = await supabaseAdmin
            .from("articles")
            .select("*, variations(*), image_articles(*)")
            .eq("is_promotion", true)
            .not("prix_promotion", "is", null)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Supabase promotions:", error);
            return res.status(500).json({ error: "Impossible de récupérer les promotions" });
        }

        // Aucune promotion trouvée
        if (!data || data.length === 0) {
            return res.status(200).json({
                message: "Aucune promotion disponible pour le moment.",
                promotions: [],
            });
        }

        return res.status(200).json(data ?? []);
    } catch (err) {
        console.error("Error /api/articles/promotions:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
