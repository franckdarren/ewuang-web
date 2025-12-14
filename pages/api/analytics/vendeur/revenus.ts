import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/analytics/vendeur/revenus:
 *   get:
 *     summary: Évolution des revenus du vendeur (Boutique)
 *     description: >
 *       Retourne l'évolution des revenus du vendeur sur une période donnée.
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

        const now = new Date();
        let dateDebut: Date;

        switch (periode) {
            case 'week':
                dateDebut = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'year':
                dateDebut = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            default:
                dateDebut = new Date(now.setMonth(now.getMonth() - 1));
        }

        const { data: commandes, error } = await supabaseAdmin
            .from("commandes")
            .select("*")
            .eq("vendeur_id", profile.id)
            .eq("statut", "Livrée")
            .gte("created_at", dateDebut.toISOString())
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Erreur récupération revenus:", error);
            return res.status(500).json({ error: "Erreur lors du calcul" });
        }

        // Grouper par jour
        const revenusParJour: Record<string, { revenu: number; nombre: number }> = {};

        commandes?.forEach(commande => {
            const dateKey = new Date(commande.created_at).toISOString().split('T')[0];
            if (!revenusParJour[dateKey]) {
                revenusParJour[dateKey] = { revenu: 0, nombre: 0 };
            }
            revenusParJour[dateKey].revenu += commande.prix;
            revenusParJour[dateKey].nombre++;
        });

        const evolution = Object.entries(revenusParJour).map(([date, data]) => ({
            date,
            revenu: data.revenu,
            nombre_commandes: data.nombre
        }));

        const totalRevenu = commandes?.reduce((sum, c) => sum + c.prix, 0) || 0;

        return res.status(200).json({
            stats: {
                periode,
                date_debut: dateDebut,
                evolution,
                total_revenu: totalRevenu,
                total_commandes: commandes?.length || 0
            }
        });
    } catch (err) {
        console.error("Error /api/analytics/vendeur/revenus:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
