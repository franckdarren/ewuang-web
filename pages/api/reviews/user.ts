// pages/api/reviews/user.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/reviews/user:
 *   get:
 *     summary: Liste les avis de l'utilisateur connecté
 *     description: Récupère tous les avis laissés par l'utilisateur connecté
 *     tags:
 *       - Avis
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *     responses:
 *       200:
 *         description: Liste des avis de l'utilisateur
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

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const { data: reviews, error, count } = await supabaseAdmin
            .from("avis")
            .select(`
        *,
        articles!inner (id, nom, image_principale)
      `, { count: "exact" })
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: "Impossible de récupérer les avis" });
        }

        // Formater les avis
        const formattedReviews = reviews?.map((review) => {
            const article = Array.isArray(review.articles) ? review.articles[0] : review.articles;
            return {
                ...review,
                article,
                articles: undefined,
            };
        }) || [];

        const totalPages = count ? Math.ceil(count / limit) : 0;

        return res.status(200).json({
            reviews: formattedReviews,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages,
            },
        });
    } catch (err) {
        console.error("Error /api/reviews/user:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}