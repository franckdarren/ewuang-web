import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/panier/get:
 *   get:
 *     summary: Récupère le panier de l'utilisateur connecté
 *     tags:
 *       - Panier
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Panier récupéré
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        // Récupérer ou créer le panier
        let { data: panier } = await supabaseAdmin
            .from("paniers")
            .select("*")
            .eq("user_id", profile.id)
            .single();

        if (!panier) {
            const { data: newPanier, error: createErr } = await supabaseAdmin
                .from("paniers")
                .insert({
                    user_id: profile.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (createErr) {
                console.error("Erreur création panier:", createErr);
                return res.status(500).json({ error: "Impossible de créer le panier" });
            }

            panier = newPanier;
        }

        // Récupérer les items
        const { data: items, error: itemsErr } = await supabaseAdmin
            .from("panier_items")
            .select(`
        *,
        articles!inner(*),
        variations(*)
      `)
            .eq("panier_id", panier.id);

        if (itemsErr) {
            console.error("Erreur récupération items:", itemsErr);
            return res.status(500).json({ error: "Erreur lors de la récupération" });
        }

        // Calculer le total
        const total = items?.reduce((sum, item) => {
            const prix = item.variations?.prix || item.articles.prix;
            const prixFinal = item.articles.is_promotion && item.articles.prix_promotion
                ? item.articles.prix_promotion
                : prix;
            return sum + (prixFinal * item.quantite);
        }, 0) || 0;

        const totalQuantite = items?.reduce((sum, item) => sum + item.quantite, 0) || 0;

        return res.status(200).json({
            panier: {
                id: panier.id,
                items: items || [],
                total_items: items?.length || 0,
                total_quantite: totalQuantite,
                total_prix: total,
            }
        });
    } catch (err) {
        console.error("Error /api/panier/get:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}