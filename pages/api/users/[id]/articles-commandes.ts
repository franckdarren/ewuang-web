import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/users/{id}/articles-commandes:
 *   get:
 *     summary: Liste les articles commandés par un utilisateur
 *     description: Cette route renvoie toutes les commandes de l'utilisateur, incluant les articles associés et leurs variations (couleur, taille, poids, etc.).
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de l'utilisateur (auth_id)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste détaillée des articles commandés avec variations
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Aucune commande trouvée pour cet utilisateur
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
            .from("commandes")
            .select(`
                id,
                created_at,
                status,
                items:articles_commandes (
                    article_id,
                    quantite,
                    variation_id,
                    variation:variation_id (
                        nom,
                        valeur
                    ),
                    article:article_id (
                        nom,
                        prix,
                        images
                    )
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
