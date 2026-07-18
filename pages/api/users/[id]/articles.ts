import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireBoutiqueAccess } from "../../../../app/lib/middlewares/requireBoutiqueAccess";

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
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        // Phase 2 : on filtre par la boutique de l'appelant (proprio ou gérant
        // → même boutique_id résolu), pas par son user.id personnel. Le `id`
        // du path est ignoré : le filtre repose uniquement sur l'identité
        // authentifiée pour empêcher un appelant de lire les articles d'une
        // autre boutique.
        const access = await requireBoutiqueAccess(req, res);
        if (!access) return;

        // Récupération des articles de la boutique
        const { data: articles, error } = await supabaseAdmin
            .from("articles")
            .select(`
                *,
                commande_articles(*),
                variations(*)
            `)
            .eq("user_id", access.boutiqueId)
            .eq("is_active", true); // exclut les articles archivés

        if (error) {
            console.error("Erreur Supabase :", error);
            return res.status(500).json({ error: "Impossible de récupérer les articles" });
        }

        // Si aucun article trouvé
        if (!articles || articles.length === 0) {
            return res.status(404).json({ error: "Aucun article trouvé pour cet utilisateur" });
        }

        // Succès
        return res.status(200).json(articles);

    } catch (err) {
        console.error("Erreur route /articles :", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}













