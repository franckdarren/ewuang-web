import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/analytics/vendeur/ventes:
 *   get:
 *     summary: Statistiques de ventes du vendeur (Boutique)
 *     description: >
 *       Retourne les informations sur les ventes réalisées par le vendeur sur une période donnée.
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
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const periode = (req.query.periode as string) || 'month';

        // Calculer date de début
        const now = new Date();
        let dateDebut: Date;

        switch (periode) {
            case 'today':
                dateDebut = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                dateDebut = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'year':
                dateDebut = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            case 'all':
                dateDebut = new Date('2020-01-01');
                break;
            default:
                dateDebut = new Date(now.setMonth(now.getMonth() - 1));
        }

        // Récupérer les commandes
        const { data: commandes, error } = await supabaseAdmin
            .from("commandes")
            .select("*")
            .eq("vendeur_id", profile.id)
            .gte("created_at", dateDebut.toISOString());

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
