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
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        // Vérification authentification
        const auth = await requireUserAuth(req, res);
        if (!auth) return;

        const { id } = req.query;
        const authenticatedUserId = auth.profile.auth_id;

        //console.log("param.id:", id);
        //console.log("authenticatedUserId:", authenticatedUserId);

        // Vérifie que user.id existe (sécurité)
        if (!auth.profile?.id) {
            return res.status(400).json({ error: "Utilisateur invalide : ID introuvable" });
        }

        // Récupère les articles commandés appartenant au user
        const { data: articles, error } = await supabaseAdmin
            .from("commande_articles")
            .select(`
                *,
                articles(*),
                variations(*),
                commandes(user_id)
            `)
            .eq("commandes.user_id", authenticatedUserId);


        if (error) {
            console.error("Erreur Supabase :", error);
            return res.status(500).json({ error: "Impossible de récupérer les articles commandés" });
        }

        // Si aucun article trouvé
        if (!articles || articles.length === 0) {
            return res.status(404).json({ error: "Aucun article trouvé pour cet utilisateur" });
        }

        // Succès
        return res.status(200).json(articles);

    } catch (err) {
        console.error("Erreur route /commande_articles :", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}

