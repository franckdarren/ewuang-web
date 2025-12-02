// pages/api/publicites/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/publicites:
 *   get:
 *     summary: Liste toutes les publicités
 *     description: Récupère toutes les publicités disponibles.
 *     tags:
 *       - Publicites
 *     responses:
 *       200:
 *         description: Liste récupérée
 *       500:
 *         description: Erreur serveur
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { data, error } = await supabaseAdmin.from("publicites").select("*").order("created_at", { ascending: false });

        if (error) return res.status(500).json({ error: "Impossible de charger les publicités" });

        return res.status(200).json({ publicites: data });
    } catch (e) {
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
