// pages/api/commandes/boutique/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/commandes/boutique:
 *   get:
 *     summary: Récupère les commandes reçues par une boutique
 *     description: >
 *       Liste toutes les commandes contenant au moins un article appartenant
 *       à la boutique de l'utilisateur connecté.
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
 *         description: Liste des commandes de la boutique
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

        // 1. Récupérer les IDs des articles de cette boutique
        const { data: articles, error: articlesError } = await supabaseAdmin
            .from("articles")
            .select("id")
            .eq("user_id", profile.id);

        if (articlesError) {
            console.error("Error fetching articles:", articlesError);
            return res.status(500).json({ error: "Impossible de récupérer les articles" });
        }

        if (!articles || articles.length === 0) {
            return res.status(200).json({
                commandes: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0,
                },
            });
        }

        const articleIds = articles.map((a) => a.id);

        // 2. Récupérer les commandes contenant ces articles
        let query = supabaseAdmin
            .from("commande_articles")
            .select(`
        commande_id,
        commandes!inner (
          *,
            users!commandes_user_id_fkey (id, name, email, phone, address)
        )
        `, { count: "exact" })
            .in("article_id", articleIds);

        if (statut) {
            query = query.eq("commandes.statut", statut);
        }

        const { data: commandeArticles, error: commandeError, count: totalCount } = await query;

        if (commandeError) {
            console.error("Supabase error:", commandeError);
            return res.status(500).json({ error: "Impossible de récupérer les commandes" });
        }

        // 3. Extraire les commandes uniques
        const commandesMap = new Map();
        commandeArticles?.forEach((ca: any) => {
            if (!commandesMap.has(ca.commande_id)) {
                commandesMap.set(ca.commande_id, ca.commandes);
            }
        });

        const uniqueCommandes = Array.from(commandesMap.values());

        // 4. Trier par date décroissante
        uniqueCommandes.sort((a: any, b: any) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        // 5. Paginer
        const paginatedCommandes = uniqueCommandes.slice(offset, offset + limit);

        // 6. Pour chaque commande, récupérer uniquement les articles de cette boutique
        const commandesWithArticles = await Promise.all(
            paginatedCommandes.map(async (commande: any) => {
                const { data: commandeArticlesDetails } = await supabaseAdmin
                    .from("commande_articles")
                    .select(`
            *,
            articles (id, nom, prix, image_principale, categorie),
            variations (id, couleur, taille, prix)
            `)
                    .eq("commande_id", commande.id)
                    .in("article_id", articleIds);

                return {
                    ...commande,
                    commande_articles: commandeArticlesDetails || [],
                };
            })
        );

        const total = uniqueCommandes.length;
        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            commandes: commandesWithArticles,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        });
    } catch (err) {
        console.error("Error /api/commandes/boutique:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}