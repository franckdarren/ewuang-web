// pages/api/articles/new.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/articles/new:
 *   get:
 *     summary: Liste les nouveaux articles
 *     description: |
 *       Retourne les articles ajoutés récemment.
 *       Query params :
 *         - days : nombre de jours à regarder en arrière (défaut : 7)
 *         - limit : nombre maximum d’articles à renvoyer (défaut : 20)
 *     tags:
 *       - Articles
 */

const querySchema = z.object({
    days: z.string().optional(),
    limit: z.string().optional()
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });
    try {
        const { days = "7", limit = "20" } = querySchema.parse(req.query);
        const d = parseInt(days);
        const lim = Math.min(100, parseInt(limit));
        const since = new Date(Date.now() - Math.max(1, d) * 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabaseAdmin
            .from("articles")
            .select("*, variations(*), image_articles(*)")
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(lim);

        if (error) {
            console.error("Supabase new articles:", error);
            return res.status(500).json({ error: "Impossible de récupérer les nouveaux articles" });
        }
        return res.status(200).json(data ?? []);
    } catch (err) {
        if (err instanceof ZodError) return res.status(400).json({ errors: err.issues });
        console.error("Error /api/articles/new:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
