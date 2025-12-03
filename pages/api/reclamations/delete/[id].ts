import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/reclamations/delete/{id}:
 *   delete:
 *     summary: Supprime une réclamation
 *     description: Supprime une réclamation spécifique en fonction de son ID.
 *     tags:
 *       - Reclamations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Supprimée
 *       404:
 *         description: Introuvable
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "DELETE") return res.status(405).json({ error: "Méthode non autorisée" });

    const { id } = req.query;
    const auth = await requireUserAuth(req, res);
    if (!auth) return;

    const { profile } = auth;

    const { error } = await supabaseAdmin
        .from("reclamations")
        .delete()
        .eq("id", id)
        .eq("user_id", profile.id);

    if (error) return res.status(500).json({ error: "Impossible de supprimer" });

    return res.status(200).json({ message: "Supprimée" });
}
