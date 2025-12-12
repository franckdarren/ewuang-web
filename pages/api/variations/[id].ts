// pages/api/variations/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/variations/{id}:
 *   get:
 *     summary: Récupère une variation spécifique
 *     description: Affiche les détails d'une variation avec ses informations de stock
 *     tags:
 *       - Variations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la variation
 *     responses:
 *       200:
 *         description: Détails de la variation
 *       404:
 *         description: Variation introuvable
 *       500:
 *         description: Erreur serveur
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const { id } = req.query;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "ID de variation invalide" });
        }

        const { data: variation, error } = await supabaseAdmin
            .from("variations")
            .select(`
        *,
        articles!inner (id, nom, prix, user_id),
        stocks (quantite)
      `)
            .eq("id", id)
            .single();

        if (error || !variation) {
            return res.status(404).json({ error: "Variation introuvable" });
        }

        // Formater la réponse pour avoir un objet article au lieu d'un tableau
        const formattedVariation = {
            ...variation,
            article: Array.isArray(variation.articles) ? variation.articles[0] : variation.articles,
            articles: undefined, // Supprimer le champ articles
        };
        delete formattedVariation.articles;

        return res.status(200).json({ variation: formattedVariation });
    } catch (err) {
        console.error("Error /api/variations/[id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}