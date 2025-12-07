// pages/api/reclamations/[id]/delete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/reclamations/{id}/delete:
 *   delete:
 *     summary: Supprime une réclamation
 *     description: >
 *       Supprime une réclamation. Accessible uniquement aux administrateurs
 *       ou au propriétaire de la réclamation si elle est en statut "en_attente_de_traitement".
 *     tags:
 *       - Réclamations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la réclamation
 *     responses:
 *       200:
 *         description: Réclamation supprimée avec succès
 *       400:
 *         description: La réclamation ne peut pas être supprimée (statut invalide)
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Réclamation introuvable
 *       500:
 *         description: Erreur serveur
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "DELETE") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const { id } = req.query;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "ID de réclamation invalide" });
        }

        // Récupérer la réclamation
        const { data: reclamation, error: fetchError } = await supabaseAdmin
            .from("reclamations")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !reclamation) {
            return res.status(404).json({ error: "Réclamation introuvable" });
        }

        // Vérifier les permissions
        const isAdmin = profile.role === "Administrateur";
        const isOwner = reclamation.user_id === profile.id;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: "Accès refusé pour supprimer cette réclamation" });
        }

        // Si l'utilisateur n'est pas admin, vérifier le statut
        if (!isAdmin) {
            if (reclamation.statut !== "en_attente_de_traitement") {
                return res.status(400).json({
                    error: "Vous ne pouvez supprimer que les réclamations en attente de traitement",
                });
            }
        }

        // Supprimer la réclamation
        const { error: deleteError } = await supabaseAdmin
            .from("reclamations")
            .delete()
            .eq("id", id);

        if (deleteError) {
            console.error("Supabase delete error:", deleteError);
            return res.status(500).json({ error: "Impossible de supprimer la réclamation" });
        }

        return res.status(200).json({
            message: "Réclamation supprimée avec succès",
            reclamation_id: id,
        });
    } catch (err) {
        console.error("Error /api/reclamations/[id]/delete:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}