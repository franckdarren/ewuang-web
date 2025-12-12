// pages/api/variations/article/[article_id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/variations/article/{article_id}:
 *   get:
 *     summary: Liste les variations d'un article
 *     description: Récupère toutes les variations (tailles, couleurs) d'un article spécifique
 *     tags:
 *       - Variations
 *     parameters:
 *       - in: path
 *         name: article_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de l'article
 *     responses:
 *       200:
 *         description: Liste des variations de l'article
 *       404:
 *         description: Article introuvable
 *       500:
 *         description: Erreur serveur
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const { article_id } = req.query;

        if (!article_id || typeof article_id !== "string") {
            return res.status(400).json({ error: "ID d'article invalide" });
        }

        // Vérifier que l'article existe
        const { data: article, error: articleError } = await supabaseAdmin
            .from("articles")
            .select("id, nom")
            .eq("id", article_id)
            .single();

        if (articleError || !article) {
            return res.status(404).json({ error: "Article introuvable" });
        }

        // Récupérer les variations
        const { data: variations, error } = await supabaseAdmin
            .from("variations")
            .select(`
        *,
        stocks (quantite)
      `)
            .eq("article_id", article_id)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: "Impossible de récupérer les variations" });
        }

        // Calculer le stock total
        const totalStock = variations?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;

        return res.status(200).json({
            article: {
                id: article.id,
                nom: article.nom,
            },
            variations: variations || [],
            totalVariations: variations?.length || 0,
            totalStock,
        });
    } catch (err) {
        console.error("Error /api/variations/article/[article_id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}