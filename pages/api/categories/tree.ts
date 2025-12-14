import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/categories/tree:
 *   get:
 *     summary: Récupère l'arbre complet des catégories
 *     tags:
 *       - Catégories
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const { data: categories, error } = await supabaseAdmin
            .from("categories")
            .select(`
        *,
        children:categories!parent_id(
          *,
            children:categories!parent_id(*)
        )
        `)
            .is("parent_id", null)
            .eq("is_active", true)
            .order("ordre", { ascending: true });

        if (error) {
            console.error("Erreur récupération arbre:", error);
            return res.status(500).json({ error: "Erreur lors de la récupération" });
        }

        return res.status(200).json({ categories });
    } catch (err) {
        console.error("Error /api/categories/tree:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}