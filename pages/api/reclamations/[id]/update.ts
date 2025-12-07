// pages/api/reclamations/[id]/update.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/reclamations/{id}/update:
 *   patch:
 *     summary: Met à jour une réclamation
 *     description: >
 *       Permet de modifier la description et le téléphone d'une réclamation.
 *       Seul le propriétaire de la réclamation peut la modifier.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 maxLength: 255
 *               phone:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       200:
 *         description: Réclamation mise à jour avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Réclamation introuvable
 *       500:
 *         description: Erreur serveur
 */

const updateReclamationSchema = z.object({
    description: z.string().max(255).min(1).optional(),
    phone: z.string().max(255).min(1).optional(),
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
            return res.status(400).json({ error: "ID de réclamation invalide" });
        }

        const body = updateReclamationSchema.parse(req.body);

        // Vérifier qu'il y a au moins un champ à mettre à jour
        if (!body.description && !body.phone) {
            return res.status(400).json({
                error: "Au moins un champ (description ou phone) doit être fourni"
            });
        }

        // Vérifier que la réclamation existe et appartient à l'utilisateur
        const { data: reclamation, error: fetchError } = await supabaseAdmin
            .from("reclamations")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !reclamation) {
            return res.status(404).json({ error: "Réclamation introuvable" });
        }

        // Vérifier que l'utilisateur est le propriétaire
        if (reclamation.user_id !== profile.id) {
            return res.status(403).json({
                error: "Vous ne pouvez modifier que vos propres réclamations"
            });
        }

        // Construire l'objet de mise à jour
        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (body.description) {
            updateData.description = body.description;
        }

        if (body.phone) {
            updateData.phone = body.phone;
        }

        // Mettre à jour la réclamation
        const { data: updatedReclamation, error: updateError } = await supabaseAdmin
            .from("reclamations")
            .update(updateData)
            .eq("id", id)
            .select(`
        *,
        users!reclamations_user_id_fkey (id, name, email, phone),
        commandes (id, numero, statut, prix)
        `)
            .single();

        if (updateError) {
            console.error("Supabase update error:", updateError);
            return res.status(500).json({ error: "Impossible de mettre à jour la réclamation" });
        }

        return res.status(200).json({
            message: "Réclamation mise à jour avec succès",
            reclamation: updatedReclamation,
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
        console.error("Error /api/reclamations/[id]/update:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}