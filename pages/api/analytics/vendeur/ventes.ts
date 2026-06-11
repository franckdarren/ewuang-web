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

        // Récupérer les commandes
        const { data: commandes, error } = await supabaseAdmin
            .from("commandes")
            .select("*")
            .eq("vendeur_id", profile.id)
            .gte("created_at", dateDebut.toISOString())
            .lte("created_at", dateFin.toISOString());

        if (error) {
            console.error("Erreur récupération commandes:", error);
            return res.status(500).json({ error: "Erreur lors du calcul" });
        }

        const total = commandes?.length || 0;
        const livrees = commandes?.filter(c => c.statut === 'livree').length || 0;
        const enCours = commandes?.filter(c =>
            ['en_preparation', 'prete_pour_livraison', 'en_cours_de_livraison'].includes(c.statut)
        ).length || 0;
        const annulees = commandes?.filter(c => c.statut === 'annule').length || 0;

        const chiffreAffaires = commandes
            ?.filter(c => c.statut === 'livree')
            .reduce((sum, c) => sum + c.prix, 0) || 0;

        const chiffreAffairesEnCours = commandes
            ?.filter(c => ['en_preparation', 'prete_pour_livraison', 'en_cours_de_livraison'].includes(c.statut))
            .reduce((sum, c) => sum + c.prix, 0) || 0;

        const panierMoyen = livrees > 0 ? Math.round(chiffreAffaires / livrees) : 0;
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
