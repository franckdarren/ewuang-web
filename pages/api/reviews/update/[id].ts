// pages/api/reviews/update/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/reviews/update/{id}:
 *   patch:
 *     summary: Modifie un avis
 *     description: >
 *       Permet à l'auteur de modifier sa note et/ou son commentaire.
 *       Seul l'auteur de l'avis peut le modifier.
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
 *               note:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               commentaire:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Avis mis à jour avec succès
 *       400:
 *         description: Données invalides ou aucun champ fourni
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Avis introuvable
 *       500:
 *         description: Erreur serveur
 */

const updateReviewSchema = z.object({
    note: z.number().int().min(1).max(5).optional(),
    commentaire: z.string().nullable().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH") {
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

        const body = updateReviewSchema.parse(req.body);

        if (body.note === undefined && body.commentaire === undefined) {
            return res.status(400).json({ error: "Au moins un champ doit être fourni (note ou commentaire)" });
        }

        // Récupérer l'avis
        const { data: review, error: fetchError } = await supabaseAdmin
            .from("avis")
            .select("id, user_id")
            .eq("id", id)
            .single();

        if (fetchError || !review) {
            return res.status(404).json({ error: "Avis introuvable" });
        }

        if (review.user_id !== profile.id) {
            return res.status(403).json({ error: "Vous ne pouvez modifier que vos propres avis" });
        }

        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (body.note !== undefined) updateData.note = body.note;
        if (body.commentaire !== undefined) updateData.commentaire = body.commentaire;

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
            return res.status(500).json({ error: "Impossible de mettre à jour l'avis" });
        }

        const user = Array.isArray(updatedReview.users) ? updatedReview.users[0] : updatedReview.users;
        const article = Array.isArray(updatedReview.articles) ? updatedReview.articles[0] : updatedReview.articles;

        return res.status(200).json({
            message: "Avis mis à jour avec succès",
            review: {
                ...updatedReview,
                user,
                article,
                users: undefined,
                articles: undefined,
            },
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
        console.error("Error /api/reviews/update/[id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
