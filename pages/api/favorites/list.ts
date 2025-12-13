// pages/api/favorites/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/favorites/list:
 *   get:
 *     summary: Liste les favoris de l'utilisateur
 *     description: Récupère tous les articles favoris de l'utilisateur connecté avec pagination
 *     tags:
 *       - Favoris
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Liste des favoris
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 favorites:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
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
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        // Récupérer les favoris avec les détails des articles
        const { data: favorites, error, count } = await supabaseAdmin
            .from("favoris")
            .select(`
        id,
        created_at,
        articles!inner (
            id,
            nom,
            description,
            prix,
            prix_promotion,
            is_promotion,
            pourcentage_reduction,
            image_principale,
            categorie,
            made_in_gabon,
            users (id, name, url_logo)
        )
        `, { count: "exact" })
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: "Impossible de récupérer les favoris" });
        }

        // Formater la réponse
        const formattedFavorites = favorites?.map((fav) => {
            const article = Array.isArray(fav.articles) ? fav.articles[0] : fav.articles;
            const user = article?.users ? (Array.isArray(article.users) ? article.users[0] : article.users) : null;

            return {
                favorite_id: fav.id,
                added_at: fav.created_at,
                article: {
                    ...article,
                    boutique: user,
                    users: undefined,
                },
            };
        }) || [];

        const totalPages = count ? Math.ceil(count / limit) : 0;

        return res.status(200).json({
            favorites: formattedFavorites,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages,
            },
        });
    } catch (err) {
        console.error("Error /api/favorites/list:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}