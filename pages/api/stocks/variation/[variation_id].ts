// pages/api/stocks/variation/[variation_id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/stocks/variation/{variation_id}:
 *   get:
 *     summary: Récupère le stock d'une variation spécifique
 *     description: Affiche le détail du stock pour une variation donnée
 *     tags:
 *       - Stocks
 *     parameters:
 *       - in: path
 *         name: variation_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la variation
 *     responses:
 *       200:
 *         description: Détails du stock
 *       404:
 *         description: Variation introuvable
 *       500:
 *         description: Erreur serveur
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const { variation_id } = req.query;

        if (!variation_id || typeof variation_id !== "string") {
            return res.status(400).json({ error: "ID de variation invalide" });
        }

        // Récupérer la variation avec son stock
        const { data: variation, error } = await supabaseAdmin
            .from("variations")
            .select(`
        id,
        couleur,
        taille,
        stock,
        prix,
        image,
        articles!inner (id, nom, image_principale),
        stocks (id, quantite, updated_at)
      `)
            .eq("id", variation_id)
            .single();

        if (error || !variation) {
            return res.status(404).json({ error: "Variation introuvable" });
        }

        const stockQuantity = variation.stocks?.[0]?.quantite || variation.stock || 0;
        const article = Array.isArray(variation.articles) ? variation.articles[0] : variation.articles;

        return res.status(200).json({
            variation: {
                id: variation.id,
                couleur: variation.couleur,
                taille: variation.taille,
                prix: variation.prix,
                image: variation.image,
            },
            article: {
                id: article?.id,
                nom: article?.nom,
                image: article?.image_principale,
            },
            stock: {
                quantite: stockQuantity,
                status:
                    stockQuantity === 0
                        ? "rupture"
                        : stockQuantity < 5
                            ? "faible"
                            : "disponible",
                last_updated: variation.stocks?.[0]?.updated_at || null,
            },
        });
    } catch (err) {
        console.error("Error /api/stocks/variation/[variation_id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}