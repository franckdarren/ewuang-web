import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/zones-livraison/list:
 *   get:
 *     summary: Liste toutes les zones de livraison
 *     description: Renvoie les zones de livraison configurées (ville + tarif). Public, utilisable par l'app cliente pour afficher la grille tarifaire.
 *     tags:
 *       - Zones de livraison
 *     parameters:
 *       - in: query
 *         name: active_only
 *         schema:
 *           type: boolean
 *         description: Si "false", inclut aussi les zones inactives (par défaut true).
 *     responses:
 *       200:
 *         description: Liste des zones de livraison
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const activeOnly = req.query.active_only !== "false";

        let query = supabaseAdmin
            .from("zones_livraison")
            .select("*")
            .order("is_default", { ascending: true })
            .order("tarif", { ascending: true });

        if (activeOnly) {
            query = query.eq("is_active", true);
        }

        const { data: zones, error } = await query;

        if (error) {
            console.error("Erreur récupération zones de livraison:", error);
            return res.status(500).json({ error: "Erreur lors de la récupération" });
        }

        return res.status(200).json({ zones, total: zones?.length || 0 });
    } catch (err) {
        console.error("Error /api/zones-livraison/list:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
