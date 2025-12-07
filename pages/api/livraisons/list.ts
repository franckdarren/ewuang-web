// pages/api/livraisons/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/livraisons/list:
 *   get:
 *     summary: Liste toutes les livraisons
 *     description: >
 *       Récupère la liste de toutes les livraisons avec leurs informations.
 *       Accessible uniquement aux administrateurs.
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
 *         description: Filtrer par statut
 *       - in: query
 *         name: ville
 *         schema:
 *           type: string
 *         description: Filtrer par ville
 *     responses:
 *       200:
 *         description: Liste des livraisons
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 livraisons:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
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

        // Vérifier que l'utilisateur est admin
        if (profile.role !== "Administrateur") {
            return res.status(403).json({ error: "Accès refusé. Administrateur requis." });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const statut = req.query.statut as string | undefined;
        const ville = req.query.ville as string | undefined;
        const offset = (page - 1) * limit;

        // Construction de la requête
        let query = supabaseAdmin
            .from("livraisons")
            .select(`
        *,
        commandes (id, numero, statut, prix, adresse_livraison),
        users (id, name, email, phone)
      `, { count: "exact" });

        // Filtres
        if (statut) {
            query = query.eq("statut", statut);
        }

        if (ville) {
            query = query.ilike("ville", `%${ville}%`);
        }

        query = query
            .order("date_livraison", { ascending: true })
            .range(offset, offset + limit - 1);

        const { data: livraisons, error, count } = await query;

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: "Impossible de récupérer les livraisons" });
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
        console.error("Error /api/livraisons:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}