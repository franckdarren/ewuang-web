import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/categories/list:
 *   get:
 *     summary: Liste toutes les catégories
 *     description: Récupère toutes les catégories avec leurs sous-catégories
 *     tags:
 *       - Catégories
 *     parameters:
 *       - in: query
 *         name: active_only
 *         schema:
 *           type: boolean
 *         description: Filtrer uniquement les catégories actives
 *     responses:
 *       200:
 *         description: Liste des catégories
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const activeOnly = req.query.active_only !== 'false';

        let query = supabaseAdmin
            .from("categories")
            .select(`
        *,
        children:categories!parent_id(*)
        `)
            .is("parent_id", null)
            .order("ordre", { ascending: true });

        if (activeOnly) {
            query = query.eq("is_active", true);
        }

        const { data: categories, error } = await query;

        if (error) {
            console.error("Erreur récupération catégories:", error);
            return res.status(500).json({ error: "Erreur lors de la récupération" });
        }

        return res.status(200).json({ categories, total: categories?.length || 0 });
    } catch (err) {
        console.error("Error /api/categories/list:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}