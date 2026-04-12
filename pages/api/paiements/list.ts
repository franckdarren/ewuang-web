// pages/api/paiements/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/paiements/list:
 *   get:
 *     summary: Liste toutes les transactions
 *     description: >
 *       Récupère la liste de toutes les transactions/paiements avec leurs relations.
 *       Accessible uniquement aux administrateurs.
 *     tags:
 *       - Paiements
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de la page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [en_attente, valide, echoue, rembourse]
 *         description: Filtrer par statut
 *       - in: query
 *         name: methode
 *         schema:
 *           type: string
 *         description: Filtrer par méthode de paiement
 *     responses:
 *       200:
 *         description: Liste des transactions
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé (admin seulement)
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

        if (profile.role !== "Administrateur") {
            return res.status(403).json({ error: "Accès refusé. Administrateur requis." });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const statut = req.query.statut as string | undefined;
        const methode = req.query.methode as string | undefined;
        const offset = (page - 1) * limit;

        let query = supabaseAdmin
            .from("paiements")
            .select(`
                *,
                users!paiements_user_id_fkey (id, name, email, phone),
                commandes (id, statut, prix)
            `, { count: "exact" });

        if (statut) {
            query = query.eq("statut", statut);
        }

        if (methode) {
            query = query.eq("methode", methode);
        }

        query = query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        const { data: paiements, error, count } = await query;

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: "Impossible de récupérer les transactions" });
        }

        const totalPages = count ? Math.ceil(count / limit) : 0;

        return res.status(200).json({
            paiements,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages,
            },
        });
    } catch (err) {
        console.error("Error /api/paiements/list:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
