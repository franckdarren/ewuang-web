import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/analytics/vendeur/articles:
 *   get:
 *     summary: Performance des articles du vendeur
 *     description: >
 *       Retourne les statistiques de performance des articles du vendeur.
 *     tags:
 *       - Analytics Vendeur
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

        // Récupérer les articles avec leurs commandes
        const { data: articles, error } = await supabaseAdmin
            .from("articles")
            .select(`
        *,
        commande_articles!inner(*, commandes(*)),
        avis(note),
        favoris(id)
        `)
            .eq("user_id", profile.id);

        if (error) {
            console.error("Erreur récupération articles:", error);
            return res.status(500).json({ error: "Erreur lors de la récupération" });
        }

        // Calculer les stats par article
        const statsArticles = articles?.map(article => {
            const commandesLivrees = article.commande_articles?.filter(
                (ca: any) => ca.commandes?.statut === 'livree'
            ) || [];

            const quantiteVendue = commandesLivrees.reduce(
                (sum: number, ca: any) => sum + ca.quantite, 0
            );

            const revenu = commandesLivrees.reduce(
                (sum: number, ca: any) => sum + (ca.prix_unitaire * ca.quantite), 0
            );

            const noteMoyenne = article.avis?.length > 0
                ? (article.avis.reduce((sum: number, a: any) => sum + a.note, 0) / article.avis.length).toFixed(1)
                : 0;

            return {
                id: article.id,
                nom: article.nom,
                prix: article.prix,
                quantite_vendue: quantiteVendue,
                revenu_genere: revenu,
                nombre_commandes: commandesLivrees.length,
                nombre_favoris: article.favoris?.length || 0,
                nombre_avis: article.avis?.length || 0,
                note_moyenne: parseFloat(noteMoyenne as string),
                is_promotion: article.is_promotion,
            };
        }) || [];

        // Trier par revenu décroissant
        statsArticles.sort((a, b) => b.revenu_genere - a.revenu_genere);

        const top10 = statsArticles.slice(0, 10);

        return res.status(200).json({
            stats: {
                resume: {
                    total_articles: statsArticles.length,
                    articles_actifs: articles?.filter(a => a.is_active).length || 0,
                    articles_en_promotion: articles?.filter(a => a.is_promotion).length || 0
                },
                top_10: top10,
                tous_articles: statsArticles
            }
        });
    } catch (err) {
        console.error("Error /api/analytics/vendeur/articles:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
