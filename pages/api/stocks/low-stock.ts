// pages/api/stocks/low-stock.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/stocks/low-stock:
 *   get:
 *     summary: Récupère les produits en stock faible ou rupture
 *     description: >
 *       Liste tous les produits avec un stock faible (< 5) ou en rupture (= 0).
 *       Les boutiques voient leurs propres produits, les admins voient tout.
 *     tags:
 *       - Stocks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Seuil de stock faible
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, low, out]
 *           default: all
 *         description: Type d'alerte (all=tous, low=stock faible, out=rupture)
 *     responses:
 *       200:
 *         description: Liste des produits en alerte stock
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

        const threshold = parseInt(req.query.threshold as string) || 5;
        const type = (req.query.type as string) || "all";

        // Récupérer toutes les variations avec leurs stocks
        let query = supabaseAdmin.from("variations").select(`
        id,
        couleur,
        taille,
        stock,
        prix,
        image,
        article_id,
        articles!inner (
          id,
          nom,
          image_principale,
          user_id,
          users (name, email)
        ),
        stocks (quantite)
      `);

        // Si pas admin, filtrer par boutique
        if (profile.role !== "Administrateur") {
            // Utiliser la syntaxe correcte pour filtrer sur une relation
            const { data: userArticles } = await supabaseAdmin
                .from("articles")
                .select("id")
                .eq("user_id", profile.id);

            if (!userArticles || userArticles.length === 0) {
                return res.status(200).json({
                    alerts: [],
                    summary: { total: 0, outOfStock: 0, lowStock: 0, threshold },
                });
            }

            const articleIds = userArticles.map((a) => a.id);
            query = query.in("article_id", articleIds);
        }

        const { data: variations, error } = await query;

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: "Impossible de récupérer les stocks" });
        }

        // Filtrer et formater les résultats
        const alerts = variations
            ?.map((v) => {
                const stockQuantity = v.stocks?.[0]?.quantite || v.stock || 0;
                const article = Array.isArray(v.articles) ? v.articles[0] : v.articles;
                const user = article?.users ? (Array.isArray(article.users) ? article.users[0] : article.users) : null;

                return {
                    variation_id: v.id,
                    article_id: v.article_id,
                    article_nom: article?.nom,
                    article_image: article?.image_principale || v.image,
                    boutique: user?.name,
                    couleur: v.couleur,
                    taille: v.taille,
                    stock: stockQuantity,
                    prix: v.prix,
                    status: stockQuantity === 0 ? "rupture" : "faible",
                };
            })
            .filter((item) => {
                if (type === "out") return item.stock === 0;
                if (type === "low") return item.stock > 0 && item.stock < threshold;
                return item.stock < threshold; // all
            })
            .sort((a, b) => a.stock - b.stock) || [];

        // Statistiques
        const outOfStock = alerts.filter((a) => a.stock === 0).length;
        const lowStock = alerts.filter((a) => a.stock > 0 && a.stock < threshold).length;

        return res.status(200).json({
            alerts,
            summary: {
                total: alerts.length,
                outOfStock,
                lowStock,
                threshold,
            },
        });
    } catch (err) {
        console.error("Error /api/stocks/low-stock:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}