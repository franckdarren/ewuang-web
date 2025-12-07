// pages/api/reclamations/commande/[commande_id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/reclamations/commande/{commande_id}:
 *   get:
 *     summary: Liste les réclamations d'une commande
 *     description: >
 *       Récupère toutes les réclamations liées à une commande spécifique.
 *       Accessible au propriétaire de la commande ou aux admins.
 *     tags:
 *       - Réclamations
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
 *         description: Liste des réclamations de la commande
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

        // Vérifier les permissions
        const isAdmin = profile.role === "Administrateur";
        const isOwner = commande.user_id === profile.id;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                error: "Accès refusé aux réclamations de cette commande"
            });
        }

        // Récupérer les réclamations de la commande
        const { data: reclamations, error } = await supabaseAdmin
            .from("reclamations")
            .select(`
        *,
        users!reclamations_user_id_fkey (id, name, email, phone)
      `)
            .eq("commande_id", commande_id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: "Impossible de récupérer les réclamations" });
        }

        return res.status(200).json({
            commande: {
                id: commande.id,
                numero: commande.numero,
                statut: commande.statut,
            },
            reclamations,
            total: reclamations?.length || 0,
        });
    } catch (err) {
        console.error("Error /api/reclamations/commande/[commande_id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}