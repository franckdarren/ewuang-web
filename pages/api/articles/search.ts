// pages/api/articles/search.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/articles/search:
 *   get:
 *     summary: Recherche d'articles par nom ou description
 *     description: |
 *       Permet de rechercher des articles via un terme.
 *       Paramètres :
 *         - q : terme obligatoire (nom ou description)
 *         - page : optionnel
 *         - perPage : optionnel
 *     tags:
 *       - Articles
 */

const querySchema = z.object({
    q: z.string().min(1),
    page: z.string().optional(),
    perPage: z.string().optional()
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });
    try {
        const { q, page = "1", perPage = "20" } = querySchema.parse(req.query);
        const p = Math.max(1, parseInt(page));
        const pp = Math.min(100, parseInt(perPage));
        const from = (p - 1) * pp;
        const to = from + pp - 1;

        const { data, error } = await supabaseAdmin
            .from("articles")
            .select("*, variations(*), image_articles(*)")
            .or(`nom.ilike.%${q}%,description.ilike.%${q}%`)
            .range(from, to)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Supabase search:", error);
            return res.status(500).json({ error: "Recherche impossible" });
        }

        // Aucun article trouvé
        if (!data || data.length === 0) {
            return res.status(200).json({
                message: "Aucun article trouvé.",
                articles: [],
            });
        }

        return res.status(200).json({ page: p, perPage: pp, data: data ?? [] });
    } catch (err) {
        if (err instanceof ZodError) return res.status(400).json({ errors: err.issues });
        console.error("Error /api/articles/search:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
