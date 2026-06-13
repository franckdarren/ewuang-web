import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";
import { resolvePeriod, isResolveError } from "../../../../app/lib/analyticsPeriod";

/**
 * @swagger
 * /api/analytics/vendeur/articles:
 *   get:
 *     summary: Performance des articles du vendeur (Boutique)
 *     description: >
 *       Retourne les statistiques de performance des articles du vendeur sur la période demandée.
 *       Les compteurs « quantité vendue / revenu / commandes » sont filtrés par la période ;
 *       les résumés (total articles, en promotion) reflètent l'état courant.
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: periode
 *         schema:
 *           type: string
 *           enum: [today, week, month, year, all]
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const resolved = resolvePeriod({
            periode: req.query.periode as string | undefined,
            from: req.query.from as string | undefined,
            to: req.query.to as string | undefined,
        });
        if (isResolveError(resolved)) {
            return res.status(400).json({ error: resolved.error });
        }
        const { startDate, endDate, period: periode } = resolved;

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

        // Statuts considérés comme ventes confirmées (paiement reçu)
        const STATUTS_VENTES = ['En préparation', 'Prête pour livraison', 'En cours de livraison', 'Livrée'];

        // Calculer les stats par article — ventes filtrées sur la période
        const statsArticles = articles?.map(article => {
            const commandesLivrees = article.commande_articles?.filter((ca: any) => {
                if (!STATUTS_VENTES.includes(ca.commandes?.statut)) return false;
                const d = ca.commandes?.created_at ? new Date(ca.commandes.created_at) : null;
                if (!d) return false;
                return d >= startDate && d <= endDate;
            }) || [];

            const quantiteVendue = commandesLivrees.reduce(
                (sum: number, ca: any) => sum + ca.quantite, 0
            );

            const revenu = commandesLivrees.reduce(
                (sum: number, ca: any) => sum + ((ca.prix_unitaire || 0) * ca.quantite), 0
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
                periode,
                date_debut: startDate,
                date_fin: endDate,
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
