// pages/api/articles/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/articles/{id}:
 *   get:
 *     summary: Détails d'un article
 *     description: Récupère les détails complets d'un article avec ses variations et images.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     tags: [Articles]
 */
const paramsSchema = z.object({ id: z.string() });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });
    try {
        const { id } = paramsSchema.parse(req.query);
        const { data: article, error } = await supabaseAdmin
            .from("articles")
            .select(`
        *,
        variations(*),
        image_articles(*),
        commande_articles(*)
        `)
            .eq("id", id)
            .single();

        if (error || !article) {
            if (error) console.error("Supabase get article:", error);
            return res.status(404).json({ error: "Article introuvable" });
        }
        return res.status(200).json(article);
    } catch (err) {
        if (err instanceof ZodError) return res.status(400).json({ errors: err.issues });
        console.error("Error /api/articles/[id]:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
