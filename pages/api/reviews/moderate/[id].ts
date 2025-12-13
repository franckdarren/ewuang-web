// pages/api/reviews/moderate/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/reviews/moderate/{id}:
 *   patch:
 *     summary: Modère un avis (Admin)
 *     description: >
 *       Permet à un administrateur de modérer un avis (valider, masquer).
 *       Accessible uniquement aux administrateurs.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_visible:
 *                 type: boolean
 *                 description: Visibilité publique de l'avis
 *               is_moderated:
 *                 type: boolean
 *                 description: Marquer comme modéré
 *     responses:
 *       200:
 *         description: Avis modéré avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé (admin seulement)
 *       404:
 *         description: Avis introuvable
 *       500:
 *         description: Erreur serveur
 */

const moderateReviewSchema = z.object({
    is_visible: z.boolean().optional(),
    is_moderated: z.boolean().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        // Vérifier que l'utilisateur est admin
        if (profile.role !== "Administrateur") {
            return res.status(403).json({ error: "Accès refusé. Administrateur requis." });
        }

        const { id } = req.query;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "ID d'avis invalide" });
        }

        const body = moderateReviewSchema.parse(req.body);

        // Vérifier qu'au moins un champ est fourni
        if (Object.keys(body).length === 0) {
            return res.status(400).json({
                error: "Au moins un champ doit être fourni"
            });
        }

        // Vérifier que l'avis existe
        const { data: review, error: fetchError } = await supabaseAdmin
            .from("avis")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !review) {
            return res.status(404).json({ error: "Avis introuvable" });
        }

        // Construire l'objet de mise à jour
        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (body.is_visible !== undefined) updateData.is_visible = body.is_visible;
        if (body.is_moderated !== undefined) updateData.is_moderated = body.is_moderated;

        // Mettre à jour l'avis
        const { data: updatedReview, error: updateError } = await supabaseAdmin
            .from("avis")
            .update(updateData)
            .eq("id", id)
            .select(`
        *,
        users!inner (id, name),
        articles!inner (id, nom)
      `)
            .single();

        if (updateError) {
            console.error("Supabase update error:", updateError);
            return res.status(500).json({ error: "Impossible de modérer l'avis" });
        }

        return res.status(200).json({
            message: "Avis modéré avec succès",
            review: updatedReview,
        });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map((i) => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        console.error("Error /api/reviews/moderate/[id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}