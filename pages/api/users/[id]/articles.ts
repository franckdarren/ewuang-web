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
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        // Vérification de l'authentification
        const auth = await requireUserAuth(req, res);
        if (!auth) return;

        const { id } = req.query;
        const authenticatedUserId = auth.profile.auth_id;

        console.log("param.id:", id);
        console.log("authenticatedUserId:", authenticatedUserId);

        // Vérifie que user.id existe (sécurité)
        if (!auth.profile?.id) {
            return res.status(400).json({ error: "Utilisateur invalide : ID introuvable" });
        }

        // Récupération des articles de l'utilisateur
        const { data: articles, error } = await supabaseAdmin
            .from("articles")
            .select(`
                *,
                commande_articles(*),
                variations(*)
            `)
            .eq("user_id", authenticatedUserId);

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













