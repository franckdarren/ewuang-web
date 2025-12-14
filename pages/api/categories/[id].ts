import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Récupère une catégorie par ID
 *     tags:
 *       - Catégories
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    const { id } = req.query;

    try {
        const { data: category, error } = await supabaseAdmin
            .from("categories")
            .select(`
        *,
        parent:categories!parent_id(*),
        children:categories!parent_id(*)
      `)
            .eq("id", id as string)
            .single();

        if (error || !category) {
            return res.status(404).json({ error: "Catégorie introuvable" });
        }

        return res.status(200).json({ category });
    } catch (err) {
        console.error("GET category error:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
