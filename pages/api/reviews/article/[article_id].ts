// pages/api/reviews/article/[article_id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/reviews/article/{article_id}:
 *   get:
 *     summary: Liste les avis d'un article
 *     description: >
 *       Récupère tous les avis visibles d'un article avec pagination et statistiques.
 *       Inclut la note moyenne, le nombre d'avis par note, etc.
 *     tags:
 *       - Avis
 *     parameters:
 *       - in: path
 *         name: article_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [recent, oldest, highest, lowest]
 *           default: recent
 *     responses:
 *       200:
 *         description: Liste des avis avec statistiques
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
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const sort = (req.query.sort as string) || "recent";
        const offset = (page - 1) * limit;

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

        // Construire la requête avec tri
        let query = supabaseAdmin
            .from("avis")
            .select(`
        *,
        users!inner (id, name)
      `, { count: "exact" })
            .eq("article_id", article_id)
            .eq("is_visible", true);

        // Appliquer le tri
        switch (sort) {
            case "oldest":
                query = query.order("created_at", { ascending: true });
                break;
            case "highest":
                query = query.order("note", { ascending: false });
                break;
            case "lowest":
                query = query.order("note", { ascending: true });
                break;
            case "recent":
            default:
                query = query.order("created_at", { ascending: false });
        }

        query = query.range(offset, offset + limit - 1);

        const { data: reviews, error, count } = await query;

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: "Impossible de récupérer les avis" });
        }

        // Récupérer les statistiques
        const { data: allReviews } = await supabaseAdmin
            .from("avis")
            .select("note")
            .eq("article_id", article_id)
            .eq("is_visible", true);

        const totalReviews = allReviews?.length || 0;
        const averageRating = totalReviews > 0
            ? allReviews!.reduce((sum, r) => sum + r.note, 0) / totalReviews
            : 0;

        // Répartition par note
        const ratingDistribution = {
            5: allReviews?.filter(r => r.note === 5).length || 0,
            4: allReviews?.filter(r => r.note === 4).length || 0,
            3: allReviews?.filter(r => r.note === 3).length || 0,
            2: allReviews?.filter(r => r.note === 2).length || 0,
            1: allReviews?.filter(r => r.note === 1).length || 0,
        };

        // Formater les avis
        const formattedReviews = reviews?.map((review) => {
            const user = Array.isArray(review.users) ? review.users[0] : review.users;
            return {
                ...review,
                user,
                users: undefined,
            };
        }) || [];

        const totalPages = count ? Math.ceil(count / limit) : 0;

        return res.status(200).json({
            article: {
                id: article.id,
                nom: article.nom,
            },
            reviews: formattedReviews,
            statistics: {
                totalReviews,
                averageRating: Math.round(averageRating * 10) / 10,
                ratingDistribution,
            },
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages,
            },
        });
    } catch (err) {
        console.error("Error /api/reviews/article/[article_id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}