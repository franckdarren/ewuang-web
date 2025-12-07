// pages/api/reclamations/[id]/update-status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/reclamations/{id}/update-status:
 *   patch:
 *     summary: Met à jour le statut d'une réclamation
 *     description: >
 *       Change le statut d'une réclamation. Accessible uniquement aux administrateurs.
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
 *             required:
 *               - statut
 *             properties:
 *               statut:
 *                 type: string
 *                 enum:
 *                   - En attente de traitement
 *                   - En cours
 *                   - Rejetée
 *                   - Remboursée
 *     responses:
 *       200:
 *         description: Statut mis à jour avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé (admin seulement)
 *       404:
 *         description: Réclamation introuvable
 *       500:
 *         description: Erreur serveur
 */

const updateStatusSchema = z.object({
    statut: z.enum([
        "En attente de traitement",
        "En cours",
        "Rejetée",
        "Remboursée",
    ]),
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
            return res.status(400).json({ error: "ID de réclamation invalide" });
        }

        const body = updateStatusSchema.parse(req.body);

        // Vérifier que la réclamation existe
        const { data: reclamation, error: fetchError } = await supabaseAdmin
            .from("reclamations")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !reclamation) {
            return res.status(404).json({ error: "Réclamation introuvable" });
        }

        // Mettre à jour le statut
        const { data: updatedReclamation, error: updateError } = await supabaseAdmin
            .from("reclamations")
            .update({
                statut: body.statut,
                updated_at: new Date().toISOString()
            })
            .eq("id", id)
            .select(`
        *,
        users!reclamations_user_id_fkey (id, name, email, phone),
        commandes (id, numero, statut, prix)
        `)
            .single();

        if (updateError) {
            console.error("Supabase update error:", updateError);
            return res.status(500).json({ error: "Impossible de mettre à jour le statut" });
        }

        return res.status(200).json({
            message: "Statut mis à jour avec succès",
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
        console.error("Error /api/reclamations/[id]/update-status:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}