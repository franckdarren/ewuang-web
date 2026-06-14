// pages/api/commandes/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";
import { resolveBoutiqueIdFor } from "../../../app/lib/middlewares/requireBoutiqueAccess";

/**
 * @swagger
 * /api/commandes/{id}:
 *   get:
 *     summary: Affiche une commande spécifique
 *     description: >
 *       Récupère les détails d'une commande avec tous ses articles, variations et informations utilisateur.
 *       L'utilisateur doit être soit le propriétaire de la commande, soit un admin.
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
 *         description: Détails de la commande
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

        const { data: commande, error } = await supabaseAdmin
            .from("commandes")
            .select(`
        *,
        users!commandes_user_id_fkey (id, name, email, phone, address),
        commande_articles (
          *,
            articles (
            id,
            nom,
            description,
            prix,
            prix_promotion,
            is_promotion,
            image_principale,
            categorie_id,
            users!articles_user_id_fkey (id, name, email, phone, url_logo)
            ),
            variations (id, couleur, taille, image)
        ),
        livraisons (*),
        reclamations (*)
        `)
            .eq("id", id)
            .single();

        if (error || !commande) {
            return res.status(404).json({ error: "Commande introuvable" });
        }

        // Vérifier que l'utilisateur a le droit d'accéder à cette commande
        if (profile.role !== "Administrateur" && commande.user_id !== profile.id) {
            // Phase 2 : pour un compte Boutique, on autorise si AU MOINS un
            // article appartient à la boutique de l'appelant (proprio OU gérant
            // → même boutique_id résolu).
            if (profile.role === "Boutique") {
                const boutiqueId = await resolveBoutiqueIdFor(profile.id, profile.role);
                const articleUserIds: string[] = (commande.commande_articles ?? [])
                    .map((ca: any) => ca.articles?.users?.id)
                    .filter(Boolean);
                if (!boutiqueId || !articleUserIds.includes(boutiqueId)) {
                    return res.status(403).json({ error: "Accès refusé à cette commande" });
                }
            } else {
                return res.status(403).json({ error: "Accès refusé à cette commande" });
            }
        }

        return res.status(200).json({ commande });
    } catch (err) {
        console.error("Error /api/commandes/[id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}