// pages/api/reviews/delete/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/reviews/delete/{id}:
 *   delete:
 *     summary: Supprime un avis
 *     description: >
 *       Supprime un avis. Seul l'auteur de l'avis ou un admin peut supprimer.
 *     tags:
 *       - Avis
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Avis supprimé avec succès
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Avis introuvable
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
            return res.status(400).json({ error: "ID d'avis invalide" });
        }

        // Récupérer l'avis
        const { data: review, error: fetchError } = await supabaseAdmin
            .from("avis")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !review) {
            return res.status(404).json({ error: "Avis introuvable" });
        }

        // Vérifier les permissions
        const isOwner = review.user_id === profile.id;
        const isAdmin = profile.role === "Administrateur";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                error: "Vous ne pouvez supprimer que vos propres avis"
            });
        }

        // Supprimer l'avis
        const { error: deleteError } = await supabaseAdmin
            .from("avis")
            .delete()
            .eq("id", id);

        if (deleteError) {
            console.error("Supabase delete error:", deleteError);
            return res.status(500).json({ error: "Impossible de supprimer l'avis" });
        }

        return res.status(200).json({
            message: "Avis supprimé avec succès",
            review_id: id,
        });
    } catch (err) {
        console.error("Error /api/reviews/delete/[id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}