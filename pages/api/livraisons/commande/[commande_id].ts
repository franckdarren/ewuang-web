// pages/api/livraisons/commande/[commande_id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/livraisons/commande/{commande_id}:
 *   get:
 *     summary: Récupère la livraison d'une commande
 *     description: >
 *       Récupère les informations de livraison pour une commande spécifique.
 *       Accessible au propriétaire de la commande, au livreur ou aux admins.
 *     tags:
 *       - Livraisons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commande_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la commande
 *     responses:
 *       200:
 *         description: Informations de livraison
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Commande ou livraison introuvable
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

        const { commande_id } = req.query;

        if (!commande_id || typeof commande_id !== "string") {
            return res.status(400).json({ error: "ID de commande invalide" });
        }

        // Vérifier que la commande existe
        const { data: commande, error: commandeError } = await supabaseAdmin
            .from("commandes")
            .select("id, user_id, numero, statut")
            .eq("id", commande_id)
            .single();

        if (commandeError || !commande) {
            return res.status(404).json({ error: "Commande introuvable" });
        }

        // Récupérer la livraison
        const { data: livraison, error } = await supabaseAdmin
            .from("livraisons")
            .select(`
        *,
        users (id, name, email, phone)
      `)
            .eq("commande_id", commande_id)
            .single();

        if (error || !livraison) {
            return res.status(404).json({ error: "Aucune livraison trouvée pour cette commande" });
        }

        // Vérifier les permissions
        const isAdmin = profile.role === "Administrateur";
        const isCommandeOwner = commande.user_id === profile.id;
        const isLivreur = livraison.user_id === profile.id;

        if (!isAdmin && !isCommandeOwner && !isLivreur) {
            return res.status(403).json({
                error: "Accès refusé aux informations de livraison de cette commande"
            });
        }

        return res.status(200).json({
            commande: {
                id: commande.id,
                numero: commande.numero,
                statut: commande.statut,
            },
            livraison,
        });
    } catch (err) {
        console.error("Error /api/livraisons/commande/[commande_id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}