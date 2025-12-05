// pages/api/commandes/[id]/articles.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/commandes/{id}/articles:
 *   get:
 *     summary: Liste les articles d'une commande spécifique
 *     description: >
 *       Récupère tous les articles d'une commande avec leurs variations et détails.
 *       L'utilisateur doit être soit le propriétaire de la commande, soit un admin,
 *       soit le propriétaire d'un des articles.
 *     tags:
 *       - Commandes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la commande
 *     responses:
 *       200:
 *         description: Liste des articles de la commande
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 commande_id:
 *                   type: string
 *                   format: uuid
 *                 numero:
 *                   type: string
 *                 statut:
 *                   type: string
 *                 articles:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Commande introuvable
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

        const { id } = req.query;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "ID de commande invalide" });
        }

        // Récupérer la commande
        const { data: commande, error: commandeError } = await supabaseAdmin
            .from("commandes")
            .select("id, numero, statut, user_id")
            .eq("id", id)
            .single();

        if (commandeError || !commande) {
            return res.status(404).json({ error: "Commande introuvable" });
        }

        // Récupérer les articles de la commande
        const { data: commandeArticles, error: articlesError } = await supabaseAdmin
            .from("commande_articles")
            .select(`
        *,
        articles (
            id,
            nom,
            description,
            prix,
            prix_promotion,
            is_promotion,
            categorie,
            image_principale,
            made_in_gabon,
            users!articles_user_id_fkey (
            id,
            name,
            email,
            phone,
            url_logo,
            address
            )
        ),
        variations (
            id,
            couleur,
            taille,
            prix,
            stock,
            image
        )
        `)
            .eq("commande_id", id)
            .order("created_at", { ascending: true });

        if (articlesError) {
            console.error("Supabase error:", articlesError);
            return res.status(500).json({ error: "Impossible de récupérer les articles" });
        }

        // Vérifier les permissions d'accès
        const isAdmin = profile.role === "Administrateur";
        const isCommandeOwner = commande.user_id === profile.id;
        const isBoutiqueOwner = commandeArticles?.some(
            (ca: any) => ca.articles?.users?.id === profile.id
        );

        if (!isAdmin && !isCommandeOwner && !isBoutiqueOwner) {
            return res.status(403).json({ error: "Accès refusé aux articles de cette commande" });
        }

        // Calculer les totaux
        const totalArticles = commandeArticles?.length || 0;
        const totalQuantite = commandeArticles?.reduce(
            (sum: number, ca: any) => sum + ca.quantite,
            0
        ) || 0;
        const sousTotal = commandeArticles?.reduce(
            (sum: number, ca: any) => sum + ca.prix_unitaire * ca.quantite,
            0
        ) || 0;

        return res.status(200).json({
            commande_id: commande.id,
            numero: commande.numero,
            statut: commande.statut,
            articles: commandeArticles || [],
            summary: {
                total_articles: totalArticles,
                total_quantite: totalQuantite,
                sous_total: sousTotal,
            },
        });
    } catch (err) {
        console.error("Error /api/commandes/[id]/articles:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}