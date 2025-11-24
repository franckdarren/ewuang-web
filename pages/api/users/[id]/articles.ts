import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/users/{id}/articles:
 *   get:
 *     summary: Récupère tous les articles liés à l'utilisateur avec leurs commandes et variations
 *     description: Cette route retourne la liste complète des articles appartenant à l'utilisateur (boutique), ainsi que les commandes associées à ces articles, incluant les variations.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID du propriétaire des articles (auth_id)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Articles + commandes + variations
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Aucun article trouvé
 *       500:
 *         description: Erreur serveur
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

    const auth = await requireUserAuth(req, res);
    if (!auth) return;

    const { id } = req.query;

    try {
        const { data, error } = await supabaseAdmin
            .from("articles")
            .select(`
                *,
                variations:article_variations (*),
                commandes:articles_commandes (
                    commande_id,
                    quantite,
                    variation_id,
                    variation:variation_id (*)
                )
            `)
            .eq("user_id", id);

        if (error) return res.status(500).json({ error: error.message });

        res.status(200).json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
}
