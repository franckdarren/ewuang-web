import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/analytics/admin/top-produits:
 *   get:
 *     summary: Produits les plus vendus (Admin)
 *     description: >
 *       Retourne les produits les plus vendus classés par quantité vendue.
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        if (profile.role !== "Administrateur") {
            return res.status(403).json({ error: "Accès interdit" });
        }

        const limit = parseInt(req.query.limit as string) || 10;

        const { data: articles, error } = await supabaseAdmin
            .from("articles")
            .select(`
        id,
        nom,
        prix,
        image_principale,
        users(id, name),
        commande_articles(quantite, prix_unitaire, commandes(statut))
        `);

        if (error) {
            console.error("Erreur récupération articles:", error);
            return res.status(500).json({ error: "Erreur lors de la récupération" });
        }

        const statsArticles = articles?.map(a => {
            const commandesLivrees = a.commande_articles?.filter(
                (ca: any) => ca.commandes?.statut === 'Livrée'
            ) || [];

            return {
                id: a.id,
                nom: a.nom,
                prix: a.prix,
                image_principale: a.image_principale,
                vendeur: a.users,
                quantite_vendue: commandesLivrees.reduce((sum: number, ca: any) => sum + ca.quantite, 0),
                revenu_genere: commandesLivrees.reduce(
                    (sum: number, ca: any) => sum + (ca.prix_unitaire * ca.quantite), 0
                )
            };
        }) || [];

        statsArticles.sort((a, b) => b.quantite_vendue - a.quantite_vendue);

        return res.status(200).json({ produits: statsArticles.slice(0, limit) });
    } catch (err) {
        console.error("Error /api/analytics/admin/top-produits:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}