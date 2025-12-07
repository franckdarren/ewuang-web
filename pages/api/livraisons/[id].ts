// pages/api/livraisons/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/livraisons/{id}:
 *   get:
 *     summary: Affiche une livraison spécifique
 *     description: >
 *       Récupère les détails d'une livraison avec ses informations de commande.
 *       Accessible à l'admin, au propriétaire de la commande ou au livreur.
 *     tags:
 *       - Livraisons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la livraison
 *     responses:
 *       200:
 *         description: Détails de la livraison
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Livraison introuvable
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
            return res.status(400).json({ error: "ID de livraison invalide" });
        }

        const { data: livraison, error } = await supabaseAdmin
            .from("livraisons")
            .select(`
        *,
        commandes (
          id,
          numero,
          statut,
          prix,
          adresse_livraison,
          user_id,
          users!commandes_user_id_fkey (id, name, email, phone),
          commande_articles (
            *,
            articles (id, nom, prix, image_principale, user_id),
            variations (id, couleur, taille)
          )
        ),
        users (id, name, email, phone)
      `)
            .eq("id", id)
            .single();

        if (error || !livraison) {
            return res.status(404).json({ error: "Livraison introuvable" });
        }

        // Vérifier les permissions
        const isAdmin = profile.role === "Administrateur";
        const isCommandeOwner = livraison.commandes?.user_id === profile.id;
        const isLivreur = livraison.user_id === profile.id;

        if (!isAdmin && !isCommandeOwner && !isLivreur) {
            return res.status(403).json({ error: "Accès refusé à cette livraison" });
        }

        return res.status(200).json({ livraison });
    } catch (err) {
        console.error("Error /api/livraisons/[id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}