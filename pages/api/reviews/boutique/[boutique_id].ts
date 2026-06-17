// pages/api/reviews/boutique/[boutique_id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";
import { resolveBoutiqueIdFor } from "../../../../app/lib/middlewares/requireBoutiqueAccess";

/**
 * @swagger
 * /api/reviews/boutique/{boutique_id}:
 *   get:
 *     summary: Liste tous les avis d'une boutique (sur tous ses articles)
 *     description: >
 *       Récupère l'ensemble des avis visibles laissés sur les articles d'une
 *       boutique, avec note moyenne, distribution 1-5 étoiles, total et
 *       pagination. Accessible au propriétaire de la boutique et aux administrateurs.
 *     tags:
 *       - Avis
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boutique_id
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
 *           default: 20
 *       - in: query
 *         name: note
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [recent, oldest, highest, lowest]
 *           default: recent
 *     responses:
 *       200:
 *         description: Liste des avis avec statistiques globales boutique
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Boutique introuvable
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

        const { boutique_id } = req.query;
        if (!boutique_id || typeof boutique_id !== "string") {
            return res.status(400).json({ error: "ID de boutique invalide" });
        }

        // Phase 2 : autoriser le proprio ET les gérants de la boutique cible.
        // Un gérant peut passer son propre user.id OU l'id du propriétaire —
        // on résout dans les deux cas l'id effectif de la boutique.
        let effectiveBoutiqueId = boutique_id;
        if (profile.role !== "Administrateur") {
            const callerBoutiqueId = await resolveBoutiqueIdFor(profile.id, profile.role);
            if (!callerBoutiqueId) {
                return res.status(403).json({ error: "Accès refusé : cette boutique ne vous appartient pas" });
            }
            // Accepter : caller a passé l'id du proprio OU son propre id (gérant)
            if (callerBoutiqueId !== boutique_id && profile.id !== boutique_id) {
                return res.status(403).json({ error: "Accès refusé : cette boutique ne vous appartient pas" });
            }
            effectiveBoutiqueId = callerBoutiqueId;
        }

        // Vérifier l'existence de la boutique
        const { data: boutique, error: boutiqueError } = await supabaseAdmin
            .from("users")
            .select("id, name, role")
            .eq("id", effectiveBoutiqueId)
            .eq("role", "Boutique")
            .maybeSingle();

        if (boutiqueError || !boutique) {
            return res.status(404).json({ error: "Boutique introuvable" });
        }

        // Récupérer la liste des IDs d'articles de la boutique
        const { data: articles, error: articlesError } = await supabaseAdmin
            .from("articles")
            .select("id")
            .eq("user_id", effectiveBoutiqueId);

        if (articlesError) {
            console.error("Supabase error (articles):", articlesError);
            return res.status(500).json({ error: "Impossible de récupérer les articles" });
        }

        const articleIds = (articles ?? []).map((a) => a.id);

        if (articleIds.length === 0) {
            return res.status(200).json({
                boutique: { id: boutique.id, name: boutique.name },
                reviews: [],
                statistics: {
                    totalReviews: 0,
                    averageRating: 0,
                    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                    totalArticlesNotes: 0,
                },
                pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
            });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const sort = (req.query.sort as string) || "recent";
        const offset = (page - 1) * limit;

        let query = supabaseAdmin
            .from("avis")
            .select(
                `
                *,
                users!inner (id, name),
                articles!inner (id, nom, image_principale)
            `,
                { count: "exact" }
            )
            .in("article_id", articleIds)
            .eq("is_visible", true);

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
            console.error("Supabase error (reviews):", error);
            return res.status(500).json({ error: "Impossible de récupérer les avis" });
        }

        // Stats globales boutique (toutes notes confondues, non filtrées)
        const { data: allReviews } = await supabaseAdmin
            .from("avis")
            .select("note, article_id")
            .in("article_id", articleIds)
            .eq("is_visible", true);

        const totalReviews = allReviews?.length || 0;
        const averageRating = totalReviews > 0
            ? allReviews!.reduce((sum, r) => sum + r.note, 0) / totalReviews
            : 0;

        const ratingDistribution = {
            5: allReviews?.filter((r) => r.note === 5).length || 0,
            4: allReviews?.filter((r) => r.note === 4).length || 0,
            3: allReviews?.filter((r) => r.note === 3).length || 0,
            2: allReviews?.filter((r) => r.note === 2).length || 0,
            1: allReviews?.filter((r) => r.note === 1).length || 0,
        };

        const totalArticlesNotes = new Set((allReviews ?? []).map((r) => r.article_id)).size;

        const formattedReviews = (reviews ?? []).map((review) => {
            const user = Array.isArray(review.users) ? review.users[0] : review.users;
            const article = Array.isArray(review.articles) ? review.articles[0] : review.articles;
            return {
                ...review,
                user,
                article,
                users: undefined,
                articles: undefined,
            };
        });

        const totalPages = count ? Math.ceil(count / limit) : 0;

        return res.status(200).json({
            boutique: { id: boutique.id, name: boutique.name },
            reviews: formattedReviews,
            statistics: {
                totalReviews,
                averageRating: Math.round(averageRating * 10) / 10,
                ratingDistribution,
                totalArticlesNotes,
            },
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages,
            },
        });
    } catch (err) {
        console.error("Error /api/reviews/boutique/[boutique_id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
