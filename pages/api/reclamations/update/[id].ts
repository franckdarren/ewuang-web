import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/reclamations/update/{id}:
 *   patch:
 *     summary: Modifie une réclamation
 *     description: Met à jour les détails d'une réclamation spécifique en fonction de son ID.
 *     tags:
 *       - Reclamations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               statut:
 *                 type: string
 *               phone:
 *                 type: string
 *               description:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 */

const schema = z.object({
    statut: z.string().optional(),
    phone: z.string().optional(),
    description: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const { id } = req.query;
        const auth = await requireUserAuth(req, res);
        if (!auth) return;

        const { profile } = auth;

        const body = schema.parse(req.body);

        const { error } = await supabaseAdmin
            .from("reclamations")
            .update({ ...body, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("user_id", profile.id);

        if (error) return res.status(500).json({ error: "Impossible de modifier" });

        return res.status(200).json({ message: "Réclamation modifiée" });
    } catch (err) {
        if (err instanceof ZodError) return res.status(400).json({ issues: err.issues });
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
