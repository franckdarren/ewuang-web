// pages/api/stocks/article/[article_id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/stocks/article/{article_id}:
 *   get:
 *     summary: Récupère les stocks d'un article
 *     description: >
 *       Affiche le détail des stocks pour toutes les variations d'un article.
 *       Inclut le stock total et le statut pour chaque variation.
 *     tags:
 *       - Stocks
 *     parameters:
 *       - in: path
 *         name: article_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de l'article
 *     responses:
 *       200:
 *         description: Détails des stocks de l'article
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

        // Vérifier que l'article existe
        const { data: article, error: articleError } = await supabaseAdmin
            .from("articles")
            .select("id, nom, user_id")
            .eq("id", article_id)
            .single();

        if (articleError || !article) {
            return res.status(404).json({ error: "Article introuvable" });
        }

        // Récupérer les variations avec leurs stocks
        const { data: variations, error } = await supabaseAdmin
            .from("variations")
            .select(`
        id,
        couleur,
        taille,
        stock,
        prix,
        stocks (id, quantite, updated_at)
      `)
            .eq("article_id", article_id);

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: "Impossible de récupérer les stocks" });
        }

        // Calculer les statistiques
        const stockDetails = variations?.map((v) => {
            const stockQuantity = v.stocks?.[0]?.quantite || v.stock || 0;
            return {
                variation_id: v.id,
                couleur: v.couleur,
                taille: v.taille,
                stock: stockQuantity,
                prix: v.prix,
                status:
                    stockQuantity === 0
                        ? "rupture"
                        : stockQuantity < 5
                            ? "faible"
                            : "disponible",
                last_updated: v.stocks?.[0]?.updated_at || null,
            };
        }) || [];

        const totalStock = stockDetails.reduce((sum, v) => sum + v.stock, 0);
        const lowStockCount = stockDetails.filter((v) => v.status === "faible").length;
        const outOfStockCount = stockDetails.filter((v) => v.status === "rupture").length;

        return res.status(200).json({
            article: {
                id: article.id,
                nom: article.nom,
                user_id: article.user_id,
            },
            stocks: stockDetails,
            summary: {
                totalStock,
                totalVariations: stockDetails.length,
                lowStock: lowStockCount,
                outOfStock: outOfStockCount,
                status:
                    outOfStockCount === stockDetails.length
                        ? "rupture_totale"
                        : lowStockCount > 0
                            ? "attention"
                            : "ok",
            },
        });
    } catch (err) {
        console.error("Error /api/stocks/article/[article_id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}