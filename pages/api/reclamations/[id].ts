import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/reclamations/{id}:
 *   get:
 *     summary: Récupère une réclamation par ID
 *     description: Récupère les détails d'une réclamation spécifique en fonction de son ID.
 *     tags:
 *       - Réclamations
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
 *         description: Réclamation trouvée
 *       404:
 *         description: Introuvable
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

    const { id } = req.query;

    const auth = await requireUserAuth(req, res);
    if (!auth) return;

    const { profile } = auth;

    const { data, error } = await supabaseAdmin
        .from("reclamations")
        .select("*")
        .eq("id", id)
        .eq("user_id", profile.id)
        .single();

    if (!data || error) {
        return res.status(404).json({ error: "Réclamation introuvable" });
    }

    return res.status(200).json({ reclamation: data });
}
