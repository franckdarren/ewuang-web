import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";
import { resolvePeriod, isResolveError } from "../../../../app/lib/analyticsPeriod";

/**
 * @swagger
 * /api/analytics/vendeur/ventes:
 *   get:
 *     summary: Statistiques de ventes du vendeur (Boutique)
 *     description: >
 *       Retourne les informations sur les ventes réalisées par le vendeur sur une période donnée.
 *       Accepte soit un préset `periode`, soit une plage `from`/`to` (prioritaire).
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

const STATUTS_PAYES = ["En préparation", "Prête pour livraison", "En cours de livraison", "Livrée"];

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
        const { startDate: dateDebut, endDate: dateFin, period: periode } = resolved;

        // Récupérer les articles de cette boutique
        const { data: articles } = await supabaseAdmin
            .from("articles")
            .select("id")
            .eq("user_id", profile.id);

        const articleIds = articles?.map((a) => a.id) || [];

        let commandes: any[] = [];

        if (articleIds.length > 0) {
            // Trouver les commandes contenant ces articles
            const { data: caLinks } = await supabaseAdmin
                .from("commande_articles")
                .select("commande_id")
                .in("article_id", articleIds);

            const commandeIds = [...new Set((caLinks?.map((c: any) => c.commande_id) || []) as string[])];

            if (commandeIds.length > 0) {
                const { data: allCmds } = await supabaseAdmin
                    .from("commandes")
                    .select("id, prix, statut, created_at")
                    .in("id", commandeIds)
                    .gte("created_at", dateDebut.toISOString())
                    .lte("created_at", dateFin.toISOString());
                commandes = allCmds || [];
            }
        }

        const total = commandes.length;
        const livrees = commandes.filter(c => c.statut === 'Livrée').length;
        const enCours = commandes.filter(c => STATUTS_PAYES.includes(c.statut) && c.statut !== 'Livrée').length;
        const annulees = commandes.filter(c => c.statut === 'Annulée' || c.statut === 'Remboursée').length;

        const commandesPayees = commandes.filter(c => STATUTS_PAYES.includes(c.statut));
        const chiffreAffaires = commandesPayees.reduce((sum, c) => sum + c.prix, 0);

        const chiffreAffairesEnCours = commandes
            .filter(c => STATUTS_PAYES.includes(c.statut) && c.statut !== 'Livrée')
            .reduce((sum, c) => sum + c.prix, 0);

        const panierMoyen = commandesPayees.length > 0 ? Math.round(chiffreAffaires / commandesPayees.length) : 0;
        const tauxConversion = total > 0 ? ((livrees / total) * 100).toFixed(2) : 0;

        return res.status(200).json({
            stats: {
                periode,
                date_debut: dateDebut,
                date_fin: dateFin,
                resume: {
                    total_commandes: total,
                    commandes_livrees: livrees,
                    commandes_en_cours: enCours,
                    commandes_annulees: annulees,
                    taux_conversion: `${tauxConversion}%`
                },
                finances: {
                    chiffre_affaires: chiffreAffaires,
                    chiffre_affaires_en_cours: chiffreAffairesEnCours,
                    panier_moyen: panierMoyen
                }
            }
        });
    } catch (err) {
        console.error("Error /api/analytics/vendeur/ventes:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
