// pages/api/livraisons/user/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/livraisons/user:
 *   get:
 *     summary: Liste les livraisons des commandes d'un utilisateur
 *     description: >
 *       Récupère toutes les livraisons liées aux commandes de l'utilisateur connecté.
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
 *           default: 10
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *         description: Filtrer par statut
 *     responses:
 *       200:
 *         description: Liste des livraisons de l'utilisateur
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

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const statut = req.query.statut as string | undefined;
        const offset = (page - 1) * limit;

        // Récupérer les IDs des commandes de l'utilisateur
        const { data: commandes, error: commandesError } = await supabaseAdmin
            .from("commandes")
            .select("id")
            .eq("user_id", profile.id);

        if (commandesError) {
            console.error("Error fetching commandes:", commandesError);
            return res.status(500).json({ error: "Impossible de récupérer les commandes" });
        }

        if (!commandes || commandes.length === 0) {
            return res.status(200).json({
                livraisons: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0,
                },
            });
        }

        const commandeIds = commandes.map((c) => c.id);

        // Construction de la requête
        let query = supabaseAdmin
            .from("livraisons")
            .select(`
        *,
        commandes (id, numero, statut, prix, adresse_livraison),
        users (id, name, email, phone)
      `, { count: "exact" })
            .in("commande_id", commandeIds);

        // Filtre par statut si fourni
        if (statut) {
            query = query.eq("statut", statut);
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
        console.error("Error /api/livraisons/user:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}