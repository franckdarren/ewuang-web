// pages/api/publicites/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/publicites/{id}:
 *   get:
 *     summary: Récupère une publicité
 *     description: Récupère une publicité par son ID.
 *     tags:
 *       - Publicites
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Publicité trouvée
 *       404:
 *         description: Introuvable
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    try {
        const { data, error } = await supabaseAdmin
            .from("publicites")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) return res.status(404).json({ error: "Publicité introuvable" });

        return res.status(200).json({ publicité: data });
    } catch {
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
