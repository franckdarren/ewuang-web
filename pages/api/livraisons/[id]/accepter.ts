// pages/api/livraisons/[id]/accepter.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/livraisons/{id}/accepter:
 *   post:
 *     summary: Accepter une livraison disponible
 *     description: >
 *       Permet à un livreur de s'auto-assigner une livraison "En attente" sans livreur.
 *       Le livreur connecté est automatiquement assigné et le statut passe à "En cours de livraison".
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
 *         description: Livraison acceptée avec succès
 *       400:
 *         description: Livraison non disponible (déjà assignée ou statut incorrect)
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé (rôle non livreur)
 *       404:
 *         description: Livraison introuvable
 *       500:
 *         description: Erreur serveur
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        if (profile.role !== "Livreur") {
            return res.status(403).json({ error: "Seuls les livreurs peuvent accepter une livraison" });
        }

        const { id } = req.query;
        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "ID de livraison invalide" });
        }

        // Récupérer la livraison
        const { data: livraison, error: fetchError } = await supabaseAdmin
            .from("livraisons")
            .select("id, statut, livreur_id, commande_id")
            .eq("id", id)
            .single();

        if (fetchError || !livraison) {
            return res.status(404).json({ error: "Livraison introuvable" });
        }

        if (livraison.livreur_id !== null) {
            return res.status(400).json({ error: "Cette livraison est déjà assignée à un livreur" });
        }

        if (livraison.statut !== "En attente") {
            return res.status(400).json({ error: "Seules les livraisons 'En attente' peuvent être acceptées" });
        }

        // Assigner le livreur et passer en cours
        const { data: updated, error: updateError } = await supabaseAdmin
            .from("livraisons")
            .update({
                livreur_id: profile.id,
                statut: "En cours de livraison",
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select(`
                *,
                commandes (id, numero, statut),
                users (id, name, email, phone)
            `)
            .single();

        if (updateError) {
            console.error("Accepter livraison error:", updateError);
            return res.status(500).json({ error: "Impossible d'accepter la livraison" });
        }

        // Synchroniser le statut de la commande
        await supabaseAdmin
            .from("commandes")
            .update({ statut: "En cours de livraison", updated_at: new Date().toISOString() })
            .eq("id", livraison.commande_id);

        return res.status(200).json({
            message: "Livraison acceptée avec succès",
            livraison: updated,
        });
    } catch (err) {
        console.error("Error /api/livraisons/[id]/accepter:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
