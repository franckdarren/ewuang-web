// pages/api/reviews/admin.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/reviews/admin:
 *   get:
 *     summary: Liste tous les avis (Admin)
 *     description: >
 *       Récupère tous les avis avec filtres de modération et pagination.
 *       Accessible uniquement aux administrateurs.
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
 *           default: 20
 *       - in: query
 *         name: is_moderated
 *         schema:
 *           type: boolean
 *           description: Filtrer par statut de modération (true/false)
 *       - in: query
 *         name: is_visible
 *         schema:
 *           type: boolean
 *           description: Filtrer par visibilité
 *       - in: query
 *         name: note
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Filtrer par note
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [recent, oldest, highest, lowest]
 *           default: recent
 *     responses:
 *       200:
 *         description: Liste des avis avec statistiques globales
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé (admin seulement)
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

        if (profile.role !== "Administrateur") {
            return res.status(403).json({ error: "Accès refusé. Administrateur requis." });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const sort = (req.query.sort as string) || "recent";
        const offset = (page - 1) * limit;

        let query = supabaseAdmin
            .from("avis")
            .select(`
                *,
                users!inner (id, name),
                articles!inner (id, nom)
            `, { count: "exact" });

        // Filtres optionnels
        if (req.query.is_moderated !== undefined) {
            query = query.eq("is_moderated", req.query.is_moderated === "true");
        }
        if (req.query.is_visible !== undefined) {
            query = query.eq("is_visible", req.query.is_visible === "true");
        }
        if (req.query.note !== undefined) {
            const note = parseInt(req.query.note as string);
            if (note >= 1 && note <= 5) {
                query = query.eq("note", note);
            }
        }

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

        // Statistiques globales (sans filtres)
        const { data: allReviews } = await supabaseAdmin
            .from("avis")
            .select("note, is_moderated, is_visible");

        const totalAll = allReviews?.length || 0;
        const totalPending = allReviews?.filter(r => !r.is_moderated).length || 0;
        const totalHidden = allReviews?.filter(r => !r.is_visible).length || 0;
        const averageRating = totalAll > 0
            ? allReviews!.reduce((sum, r) => sum + r.note, 0) / totalAll
            : 0;

        const formattedReviews = reviews?.map((review) => {
            const user = Array.isArray(review.users) ? review.users[0] : review.users;
            const article = Array.isArray(review.articles) ? review.articles[0] : review.articles;
            return {
                ...review,
                user,
                article,
                users: undefined,
                articles: undefined,
            };
        }) || [];

        const totalPages = count ? Math.ceil(count / limit) : 0;

        return res.status(200).json({
            reviews: formattedReviews,
            statistics: {
                total: totalAll,
                pendingModeration: totalPending,
                hidden: totalHidden,
                averageRating: Math.round(averageRating * 10) / 10,
            },
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages,
            },
        });
    } catch (err) {
        console.error("Error /api/reviews/admin:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
