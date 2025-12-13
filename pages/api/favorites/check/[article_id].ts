// pages/api/favorites/check/[article_id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/favorites/check/{article_id}:
 *   get:
 *     summary: Vérifie si un article est dans les favoris
 *     description: Retourne true si l'article est dans les favoris de l'utilisateur, false sinon
 *     tags:
 *       - Favoris
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: article_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de l'article à vérifier
 *     responses:
 *       200:
 *         description: Statut du favori
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isFavorite:
 *                   type: boolean
 *                 article_id:
 *                   type: string
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const { article_id } = req.query;

        if (!article_id || typeof article_id !== "string") {
            return res.status(400).json({ error: "ID d'article invalide" });
        }

        // Vérifier si l'article est dans les favoris
        const { data: favorite, error } = await supabaseAdmin
            .from("favoris")
            .select("id, created_at")
            .eq("user_id", profile.id)
            .eq("article_id", article_id)
            .maybeSingle();

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: "Impossible de vérifier les favoris" });
        }

        return res.status(200).json({
            isFavorite: !!favorite,
            article_id,
            favorite_id: favorite?.id || null,
            added_at: favorite?.created_at || null,
        });
    } catch (err) {
        console.error("Error /api/favorites/check/[article_id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}