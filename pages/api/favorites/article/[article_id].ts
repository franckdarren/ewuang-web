// pages/api/favorites/article/[article_id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/favorites/article/{article_id}:
 *   get:
 *     summary: Liste les likes (favoris) d'un article
 *     description: Retourne le nombre total de likes et la liste paginée des utilisateurs qui ont mis cet article en favori
 *     tags:
 *       - Favoris
 *     parameters:
 *       - in: path
 *         name: article_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de l'article
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de la page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Nombre d'éléments par page
 *     responses:
 *       200:
 *         description: Liste des likes de l'article
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 likes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user_id:
 *                         type: string
 *                       user_name:
 *                         type: string
 *                       user_logo:
 *                         type: string
 *                       liked_at:
 *                         type: string
 *                 pagination:
 *                   type: object
 *       400:
 *         description: ID d'article invalide
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

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        // Vérifier que l'article existe
        const { data: article, error: articleError } = await supabaseAdmin
            .from("articles")
            .select("id")
            .eq("id", article_id)
            .single();

        if (articleError || !article) {
            return res.status(404).json({ error: "Article introuvable" });
        }

        // Récupérer les likes (favoris) de l'article avec les infos utilisateur
        const { data: likes, error, count } = await supabaseAdmin
            .from("favoris")
            .select(`
                id,
                created_at,
                users!user_id (id, name, url_logo)
            `, { count: "exact" })
            .eq("article_id", article_id)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: "Impossible de récupérer les likes" });
        }

        const formattedLikes = likes?.map((like) => {
            const user = Array.isArray(like.users) ? like.users[0] : like.users;
            return {
                user_id: user?.id ?? null,
                user_name: user?.name ?? null,
                user_logo: user?.url_logo ?? null,
                liked_at: like.created_at,
            };
        }) ?? [];

        const totalPages = count ? Math.ceil(count / limit) : 0;

        return res.status(200).json({
            total: count ?? 0,
            likes: formattedLikes,
            pagination: {
                page,
                limit,
                total: count ?? 0,
                totalPages,
            },
        });
    } catch (err) {
        console.error("Error /api/favorites/article/[article_id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
