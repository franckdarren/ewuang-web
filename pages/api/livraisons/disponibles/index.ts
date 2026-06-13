// pages/api/livraisons/disponibles/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/livraisons/disponibles:
 *   get:
 *     summary: Liste les livraisons disponibles à accepter
 *     description: >
 *       Retourne les livraisons "En attente" sans livreur assigné.
 *       Accessible aux livreurs et administrateurs.
 *     tags:
 *       - Livraisons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Liste des livraisons disponibles
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       500:
 *         description: Erreur serveur
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        if (profile.role !== "Livreur" && profile.role !== "Administrateur") {
            return res.status(403).json({ error: "Accès refusé" });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const { data: livraisons, error, count } = await supabaseAdmin
            .from("livraisons")
            .select(`
                *,
                commandes!inner (id, numero, statut, prix, adresse_livraison)
            `, { count: "exact" })
            .eq("statut", "En attente")
            .is("livreur_id", null)
            .eq("commandes.statut", "Prête pour livraison")
            .order("date_livraison", { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: "Impossible de récupérer les livraisons disponibles" });
        }

        const totalPages = count ? Math.ceil(count / limit) : 0;

        return res.status(200).json({
            livraisons,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages,
            },
        });
    } catch (err) {
        console.error("Error /api/livraisons/disponibles:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
