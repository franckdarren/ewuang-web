// pages/api/reviews/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     summary: Récupère un avis par son ID
 *     description: Retourne le détail d'un avis avec les informations de l'auteur et de l'article.
 *     tags:
 *       - Avis
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Détail de l'avis
 *       400:
 *         description: ID invalide
 *       404:
 *         description: Avis introuvable
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
            return res.status(400).json({ error: "ID d'avis invalide" });
        }

        const { data: review, error } = await supabaseAdmin
            .from("avis")
            .select(`
                *,
                users!inner (id, name),
                articles!inner (id, nom, image_principale)
            `)
            .eq("id", id)
            .eq("is_visible", true)
            .single();

        if (error || !review) {
            return res.status(404).json({ error: "Avis introuvable" });
        }

        const user = Array.isArray(review.users) ? review.users[0] : review.users;
        const article = Array.isArray(review.articles) ? review.articles[0] : review.articles;

        return res.status(200).json({
            review: {
                ...review,
                user,
                article,
                users: undefined,
                articles: undefined,
            },
        });
    } catch (err) {
        console.error("Error /api/reviews/[id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
