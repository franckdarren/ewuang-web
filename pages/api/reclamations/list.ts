import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/reclamations/list:
 *   get:
 *     summary: Liste les réclamations de l'utilisateur
 *     description: Récupère toutes les réclamations associées à l'utilisateur authentifié.
 *     tags:
 *       - Reclamations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste renvoyée
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

    const auth = await requireUserAuth(req, res);
    if (!auth) return;

    const { profile } = auth;

    const { data, error } = await supabaseAdmin
        .from("reclamations")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

    if (error) {
        return res.status(500).json({ error: "Impossible de récupérer les réclamations" });
    }

    return res.status(200).json({ reclamations: data });
}
