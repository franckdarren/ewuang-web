// pages/api/annonces/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserRole } from "../../../app/lib/middlewares/requireUserRole";

/**
 * @swagger
 * /api/annonces/list:
 *   get:
 *     summary: Liste toutes les publicités (admin uniquement)
 *     tags:
 *       - Publicites
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste récupérée
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès interdit
 *       500:
 *         description: Erreur serveur
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserRole(["Administrateur"])(req, res);
        if (!auth) return;

        const { data, error } = await supabaseAdmin
            .from("publicites")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Supabase publicites error:", JSON.stringify(error));
            return res.status(500).json({ error: "Impossible de charger les publicités", detail: error.message });
        }

        return res.status(200).json({ publicites: data });
    } catch (e) {
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
