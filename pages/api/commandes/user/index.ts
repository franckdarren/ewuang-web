// pages/api/commandes/user/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/commandes/user:
 *   get:
 *     summary: Liste les commandes d'un utilisateur
 *     description: >
 *       Récupère toutes les commandes passées par l'utilisateur connecté.
 *     tags:
 *       - Commandes
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
 *           enum: [en_attente, en_preparation, prete_pour_livraison, en_cours_de_livraison, livree, annule, rembourse]
 *         description: Filtrer par statut
 *     responses:
 *       200:
 *         description: Liste des commandes de l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 commandes:
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

        // Construction de la requête
        let query = supabaseAdmin
            .from("commandes")
            .select(`
        *,
        commande_articles (
          *,
            articles (id, nom, prix, image_principale, categorie),
            variations (id, couleur, taille, prix)
        ),
        livraisons (*)
        `, { count: "exact" })
            .eq("user_id", profile.id);

        // Filtre par statut si fourni
        if (statut) {
            query = query.eq("statut", statut);
        }

        query = query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        const { data: commandes, error, count } = await query;

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: "Impossible de récupérer les commandes" });
        }

        const totalPages = count ? Math.ceil(count / limit) : 0;

        return res.status(200).json({
            commandes,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages,
            },
        });
    } catch (err) {
        console.error("Error /api/commandes/user:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}